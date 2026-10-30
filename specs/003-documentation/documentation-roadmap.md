---
description: "Phase 003 — documentation roadmap for the Sharwa platform: developer/API reference, Arabic user manuals and architecture/DevOps guide, mapped task by task to the 49 integrated modules"
source: "specs/002-sharwa-integration/integration-inventory.md, itself built from integration-tasks.md (INT-001 → INT-049, Part A cross-cutting architecture, Part B Domains 1–16, Part C traceability)"
created: 2026-10-26
status: "Phase 003 complete but one task — 535 / 536. All 52 official execution-plan steps have run; Step 52 (M-6 · 4.2) closed on 2026-10-30 with fares's sign-offs on DOC-007, DOC-011, DOC-012, DOC-014, DOC-284, DOC-522 (option A), DOC-533 and DOC-536 (publication in the repository only, for now), and with the three A.13 code fixes of DOC-461/DOC-535. Still open: DOC-520 (Step 09) — the Django test-suite register must match a real test-discovery count, which needs a Python run of sharwa_saas on fares's machine (`DiscoverRunner.build_suite()` command in docs/ops/testing/django-suites.md). Not blocking but recorded: 279 guide screenshot references not captured yet (256 via scripts/guide-screenshots.ts, 23 manual — docs/guides/_screenshots.md); Step 39 staging checks of DOC-508, 510, 517 and 519 not run; code defects and open items in docs/architecture/90-open-items.md (OI-10, OI-21 …). Coverage proof docs/_coverage.md; consistency report docs/_verification.md; maintenance rule docs/README.md#maintenance. Task notes 'written in run NN' name the prompt run, mapped to official steps in docs/CHANGELOG.md; DOC-024 documents that personal access tokens are not yet accepted by any route"
---

# Documentation Roadmap — Sharwa Phase 003 (خارطة طريق التوثيق)

**Purpose**: turn the integrated Sharwa platform (49 modules M01–M49, 16 domains, 39 live module keys, 28 migrations, 49 Django test suites) into professional documentation for three audiences — developers/integrators, merchants and their staff (plus buyers, couriers and Sharwa Pay customers), and platform administrators/operators.

**Zero-omission rule**: every feature, route, payload, gate, rule, mapping, Arabic message, migration, background job, environment variable, test suite and open item recorded in `integration-inventory.md` is assigned below to at least one `DOC-XXX` task, inside that task's **Must document / Must cover** bullets. The writer of each page should never need to reopen the inventory; they verify against the code instead (Track 4). Appendix A proves the coverage per INT task and per Part A section.

## How to use this roadmap

- Work milestone by milestone (Track 0, task "Set the execution order and milestones"). Tick a task `[x]` only when its page exists, follows its template, contains every bullet listed, and was checked against `sharwa_saas` + `sharwa-frontend`.
- Task shape: **Source** (INT id · module · inventory section) → **Output** (the file to create under `sharwa-frontend/docs/`) → **Must document / Must cover** (the complete checklist of content) → **Done when** (acceptance). Track 2 tasks also name the **Audience** and the **Screenshots** to capture.
- Conventions carried over from the inventory: Django routes are under `/api/v1/` unless written otherwise; BFF routes are under `/api/bff/`; paths are relative to each repo (`sharwa_saas` = Django, `sharwa-frontend` = Next.js); Arabic strings in «…» are the exact server/UI sentences and must be quoted verbatim.
- Process: Claude writes the files; fares reviews and runs the `git add` / `git commit` / `git push` commands himself.

## Milestones

> Set by DOC-006 (Step 01) — **approved by fares (2026-10-27)**. Execution order and steps: [`execution-plan.md`](execution-plan.md). Every DOC task belongs to exactly one milestone (536 / 536 tagged by the ranges below).

| Milestone | Goal | Steps | DOC tasks | Count |
|---|---|---|---|---|
| **M-1 Foundations** | Track 0 + Track 1 overview pages (tooling, auth, conventions, BFF) + Track 3 system overview, multi-tenancy, BFF, security, integrity, environment, testing + the Arabic manual framework. Every other page links to these. | 01–10 | DOC-001…047, DOC-284…289, DOC-444…480, DOC-511…514, DOC-520…522 | 97 |
| **M-2 Buyer journey** (US1/US2) | Landing → onboarding → dashboard entry; store → product → cart → checkout → tracking, PWA, engagement — in all three tracks. | 11–16 | DOC-048…059, DOC-089…123, DOC-290…299, DOC-318…334 | 74 |
| **M-3 Merchant core** (US3) | Catalog, orders/returns, customers/wallets, marketing/design/partners, finance, inventory/locations/procurement, shipping/courier/Sharwa Ship, settings/staff/integrations, webhooks, reports — API, guides, data model D1–8, jobs, migrations, deployment, infra fixes. | 17–39 | DOC-060…088, DOC-124…163, DOC-169…221, DOC-263…265, DOC-300…317, DOC-335…356, DOC-359…397, DOC-425…427, DOC-481…488, DOC-497…510, DOC-515…519, DOC-523…525 | 237 |
| **M-4 Platform owner console** (US4) | Re-provision a store, enable a feature, approve a wallet top-up, collect a due — M20/M45/M46 API + console manual. | 40–42 | DOC-266…283, DOC-431…443 | 31 |
| **M-5 P3 modules** (US3/US5) | B2B, apps/AI/support, inbox & channels, marketplaces, dropshipping, POS, bookings — API + guides; Sharwa Pay guide; data model D9–16; open-items register. | 43–50 | DOC-164…168, DOC-222…262, DOC-357…358, DOC-398…424, DOC-428…430, DOC-489…496, DOC-526…528 | 89 |
| **M-6 Verification & sign-off** | Track 4: verification against code, coverage, consistency, A.13 fixes, publishing. | 51–52 | DOC-529…536 | 8 |

## Tracks at a glance

| Track | Scope | Tasks | DOC range |
|---|---|---|---|
| Track 0 — Documentation Governance & Foundations | Where the docs live, language, glossary, templates, ownership and milestones. Every other track builds on these pages. | 6 | DOC-001 → DOC-006 |
| Track 1 — Developer & API Reference | OpenAPI + Postman, authentication flows, cross-cutting API conventions, the BFF layer, then every Django `/api/v1/` endpoint group of the 16 domains (English, Arabic messages verbatim). Output: `docs/api/`. | 277 | DOC-007 → DOC-283 |
| Track 2 — Merchant, Staff, Buyer, Courier, Sharwa Pay & Platform Admin User Manuals | Arabic (RTL) task-oriented manuals for every screen and workflow, per audience and role/permission. Output: `docs/guides/`. | 160 | DOC-284 → DOC-443 |
| Track 3 — Architecture & DevOps Guide | Multi-tenancy, BFF/live-mock architecture, security, data & money integrity, data model, Celery jobs, migrations, environment, deployment, testing, open items register. Output: `docs/architecture/` + `docs/ops/`. | 85 | DOC-444 → DOC-528 |
| Track 4 — Verification, Coverage & Publishing | Proves the documentation is correct (checked against code), complete (coverage matrix) and maintained. | 8 | DOC-529 → DOC-536 |

**Total: 536 tasks.**

## Target documentation tree

```
sharwa-frontend/docs/
├── README.md                     # index per audience, language policy, contributing, maintenance
├── glossary.md                   # Arabic ↔ English terms, M01–M49 names
├── CHANGELOG.md
├── _templates/                   # api-endpoint, guide-page, architecture-page, runbook
├── api/                          # Track 1 (English)
│   ├── openapi/sharwa-v1.yaml
│   ├── postman/sharwa.postman_collection.json + environments/
│   ├── overview/                 # auth, csrf, conventions, errors, money, idempotency, conflicts, pagination, rate-limits, bff
│   ├── integrators/              # outgoing webhooks, inbound webhook receivers
│   └── domains/NN-<slug>/        # one page per module / endpoint group
├── guides/                       # Track 2 (Arabic, RTL)
│   ├── merchant/NN-<slug>/       # owner + staff
│   ├── buyer/                    # storefront help centre
│   ├── courier/                  # M38 courier app
│   ├── sharwa-pay/               # M40 customers
│   └── console/                  # «مالك المنصة» + «مشرف تشغيلي»
├── architecture/                 # Track 3 (English)
└── ops/                          # Track 3 runbooks, deployment, testing
```

Domain slugs (shared by all tracks): `01-public-onboarding` · `02-dashboard-shell` · `03-catalog` · `04-orders-returns` · `05-storefront` · `06-customers-wallets` · `07-marketing-design-partners` · `08-finance` · `09-b2b` · `10-inventory-locations-procurement` · `11-shipping` · `12-settings-staff-integrations` · `13-channels-operations` · `14-apps-ai-support` · `15-reports` · `16-platform-console`.

---

## Track 0 — Documentation Governance & Foundations

> Where the docs live, language, glossary, templates, ownership and milestones. Every other track builds on these pages.

### 0.1 Documentation home, structure and ownership

- [x] **DOC-001** — Create the documentation tree and its index
  - **Source**: inventory header + Part B domain list (16 domains) · Part C (49 tasks)
  - **Output**: `docs/README.md` + the empty folders below, each with a `README.md` stub
  - **Must document**:
    - The tree: `docs/api/` (Track 1: `openapi/`, `postman/`, `overview/`, `domains/NN-<slug>/`, `integrators/`), `docs/guides/` (Track 2: `merchant/`, `buyer/`, `courier/`, `sharwa-pay/`, `console/`), `docs/architecture/` and `docs/ops/` (Track 3), `docs/glossary.md`, `docs/CHANGELOG.md`.
    - The 16 domain slugs used by every track: `01-public-onboarding`, `02-dashboard-shell`, `03-catalog`, `04-orders-returns`, `05-storefront`, `06-customers-wallets`, `07-marketing-design-partners`, `08-finance`, `09-b2b`, `10-inventory-locations-procurement`, `11-shipping`, `12-settings-staff-integrations`, `13-channels-operations`, `14-apps-ai-support`, `15-reports`, `16-platform-console`.
    - An index page per audience (developer → Track 1 + 3, merchant/staff → Track 2 merchant, buyer, courier, Sharwa Pay customer, platform owner/operator) that links every page produced by this roadmap.
    - The relationship to `specs/` (001 frontend platform spec, 002 integration tasks + `integration-inventory.md`, this 003 roadmap) and to `sharwa_saas` (Django) — paths in docs are written repo-relative as in the inventory (`sharwa_saas` = Django, `sharwa-frontend` = Next.js; Django routes under `/api/v1/`, BFF routes under `/api/bff/`).
  - **Done when**: `docs/README.md` exists, every folder of the tree exists, and the index links resolve.

- [x] **DOC-002** — Decide and record the documentation language policy
  - **Source**: inventory conventions (Arabic strings in «…» are exact server/UI sentences) · project direction (Arabic RTL merchants)
  - **Output**: `docs/README.md` § Language policy
  - **Must document**:
    - Default proposal (decision for fares): developer/API (Track 1) and architecture/DevOps (Track 3) in English; merchant, staff, buyer, courier, Sharwa Pay and console manuals (Track 2) in Arabic (RTL).
    - Arabic server and UI messages are always quoted verbatim in «…» in every language, never paraphrased or translated in place (a translation may follow in parentheses in English docs).
    - Terminology rule: one Arabic term per concept, taken from the UI (e.g. «مالك المتجر», «مدير المتجر», «مدير الفرع», «مالك المنصة», «مشرف تشغيلي», «شروة شيب», «شروة باي»).
  - **Done when**: the policy is approved by fares and recorded.
  - **Status**: approved by fares (2026-10-27).

- [x] **DOC-003** — Write the bilingual glossary
  - **Source**: inventory Part A (A.4 identities, A.5 features/permissions, A.6 currencies) + all domains
  - **Output**: `docs/glossary.md`
  - **Must document**:
    - Platform terms: tenant/store schema vs public schema, store host vs platform origin vs console (`console.<base>`), BFF, live/mock switch, live module key, Data Contract (Zod schema + fixture), Django-first adapter, «Ready» passthrough row, `[NEEDS BACKEND]`.
    - Identities: storefront visitor, store owner, staff member, courier agent, platform console user (owner «مالك المنصة» / operator «مشرف تشغيلي»), Sharwa Pay customer, multi-store owner (`MerchantAccount`).
    - Commerce terms: derived customer (`customer_key`), platform trust vs store trust, fulfilment status vs financial status, waybill/AWB, master/child shipments, custody ledger, shift, register, receipt, approval request, write-off, purchase order, tier price, bundle, personalization, auction/anti-sniping, booking slot/hold, dropshipping feed, pricing rule, marketplace listing, campaign, offer, coupon, abandoned cart, timeline, loyalty points, customer wallet, merchant wallet, Sharwa Pay wallet, dues/commission/app billing charge.
    - Currencies `SAR`, `USD`, `YER_OLD` «ريال يمني (صنعاء)», `YER_NEW` «ريال يمني (عدن)».
    - Module ids M01–M49 ↔ INT-001…INT-049 ↔ English and Arabic names (from Part C and the domain titles).
  - **Done when**: every term used in a doc heading across Tracks 1–3 has a glossary entry.

- [x] **DOC-004** — Define page templates for each track
  - **Source**: inventory "How to read it" entry structure (Before · Django provider · Routes & payloads · Gates · Rules · Mapping · Gaps closed / migrations · Bugs fixed · Frontend · Tests · Out of scope / open)
  - **Output**: `docs/_templates/api-endpoint.md`, `docs/_templates/guide-page.md`, `docs/_templates/architecture-page.md`, `docs/_templates/runbook.md`
  - **Must document**:
    - API page: purpose, live key + BFF route(s), Django provider file(s), identity, gate chain in A.5 order, per-endpoint method/path/query/body/response/status codes/Arabic errors, rules, mapping notes ("Django is the authority"), idempotency/locking, side effects (Celery, webhooks, notifications, audit log), related tests, open items.
    - Guide page (Arabic): who can do it (role + permission key + plan feature), where it is (dashboard route), steps, fields, messages and what to do, limits, screenshots, related pages.
    - Architecture page: components, data model, flows (sequence diagrams), invariants, failure modes, related migrations.
    - Runbook: trigger, prerequisites, steps, verification, rollback.
  - **Done when**: templates exist and every track's first page uses them.

- [x] **DOC-005** — Assign ownership, review flow and the Definition of Done for every DOC task
  - **Source**: project process (fares reviews each phase; Claude never commits/pushes — git commands are handed to fares)
  - **Output**: `docs/README.md` § Contributing
  - **Must document**:
    - Each DOC task is ticked only after its page exists, follows its template, every "Must document / Must cover" bullet is present, and it was checked against the code (`sharwa_saas` + `sharwa-frontend`) rather than only against the inventory.
    - Review: fares approves per track; screenshots and examples come from mock mode (`SHARWA_LIVE_MODULES=none`) unless the page is about live behaviour.
    - Git: Claude prepares the files; fares runs `git add` / `git commit` / `git push` himself at the end of each batch.
    - `docs/CHANGELOG.md` entry per batch.
  - **Done when**: the contributing section is approved.
  - **Status**: approved by fares (2026-10-27).

- [x] **DOC-006** — Set the execution order and milestones for Phase 003
  - **Source**: inventory Part C phase checkpoints US1–US5 · Part A
  - **Output**: `specs/003-documentation/documentation-roadmap.md` § Milestones (this file) — update the checklist as tasks complete
  - **Must document**:
    - Milestone M-1: Track 0 + Track 1 overview pages (auth, conventions, BFF) + Track 3 system overview — the base every other page links to.
    - Milestone M-2: the buyer journey end to end (US1/US2: landing → store → product → cart → checkout → tracking) in all three tracks.
    - Milestone M-3: merchant core (catalog, orders, customers, settings, staff, inventory, shipping, payments).
    - Milestone M-4: platform owner console (US4: re-provision a store, enable a feature, approve a wallet top-up, collect a due).
    - Milestone M-5: P3 modules (channels, marketplaces, dropshipping, POS, bookings, apps, AI, support, B2B, advanced products, Sharwa Ship/Pay, courier, rollup, expenses) (US3/US5).
    - Milestone M-6: Track 4 verification and sign-off.
  - **Done when**: milestones are agreed and each DOC task is tagged with one.
  - **Status**: approved by fares (2026-10-27).

---

## Track 1 — Developer & API Reference

> OpenAPI + Postman, authentication flows, cross-cutting API conventions, the BFF layer, then every Django `/api/v1/` endpoint group of the 16 domains (English, Arabic messages verbatim). Output: `docs/api/`.

### 1.1 API documentation tooling

Machine-readable reference for every Django `/api/v1/` route and every Next.js `/api/bff/` row, kept in lock-step with the frontend Data Contract (Zod schemas + mock fixtures), which stays the immutable source of truth (A.1).

- [x] **DOC-007** — Decide the OpenAPI generation strategy for `/api/v1/`
  - **Source**: A.1, A.2, A.12 · all 49 INT tasks
  - **Output**: `docs/api/openapi/README.md` (decision record)
  - **Must document**:
    - Options compared: `drf-spectacular` auto-generation vs a hand-written `sharwa-v1.yaml` vs a hybrid (generated skeleton + hand-curated components). The views mix DRF class views with serializers (`serializers_products.py`, `serializers_orders.py`, `ReportExportJobSerializer`, `ScheduledReportSerializer`, `StoreConfigSerializer`) and service-backed APIView/function views that build dicts directly (most `api/views_*.py` modules), so auto-generation alone will miss response shapes.
    - Hard requirements for the choice: the JSON shapes must equal the Zod schemas in `src/features/<module>/schemas.ts`; Arabic messages quoted verbatim; per-route gates (session, plan feature, permission key, owner-only); multipart routes (theme logo, offers image, feeds, product import, Sharwa Pay top-up, checkout); public-schema-only routes (console, Sharwa Pay) vs store-host routes.
    - Where the generated file lives (`sharwa_saas` build step) and how it is copied to `docs/api/openapi/sharwa-v1.yaml`; whether a dependency is added to Django (none was added in Phase 002 except `dnspython`).
    - Owner sign-off checkbox (fares decides before DOC tasks that author the YAML start).
  - **Done when**: the decision is written and approved, and the chosen tool runs once on the Django repo.
  - **Status**: written in Step 02 (2026-10-27): `docs/api/openapi/README.md` §1 — hybrid strategy; the route-inventory tool ran on `sharwa_saas`. Awaiting fares's approval. **Closed in official Step 52 (2026-10-30)**: fares approved the hybrid strategy; the decision record in `docs/api/openapi/README.md` §1 now reads ☑ approved.

- [x] **DOC-008** — Author the OpenAPI skeleton: servers, security schemes, tags, shared components
  - **Source**: A.4, A.5, A.6, A.7 · inventory Part C (16 domains)
  - **Output**: `docs/api/openapi/sharwa-v1.yaml`
  - **Must document**:
    - Servers: store host (`<sub>.<base>` / custom domain, or local tenant host with `X-Store-Domain`), platform origin (Sharwa Pay `/api/v1/sharwa-pay/*`), console origin `console.<base>` (`/api/v1/platform/*`); base path `/api/v1/`.
    - Security schemes: Django `sessionid` cookie (store owner `is_merchant_authenticated` + `auth_tenant_schema`; staff `StaffSession`; console admin session; Sharwa Pay `sharwa_pay_auth_phone`), CSRF header `X-CSRFToken` on unsafe methods, `Idempotency-Key` header, personal access tokens `shw_pat_…` (INT-022) if usable on the API.
    - One tag per domain (16) and per module (M01–M49), and `x-live-key` vendor extension per operation carrying the `SHARWA_LIVE_MODULES` key of A.3 (or `django-first`).
    - Reusable components: `DisplayMoney` (string), `Currency` enum `SAR|USD|YER_OLD|YER_NEW`, error bodies (`Detail`, `FieldErrors`, `CodeError`, `FeatureDisabled`, `Conflict` variants of A.7), paging envelope `{count, results}`, `Retry-After` header.
  - **Done when**: the YAML validates (spectral/openapi-cli) and every domain tag exists.

- [x] **DOC-009** — Build the Zod ↔ OpenAPI contract-diff check
  - **Source**: A.1 (Data Contract is immutable) · A.12 (mock E2E scripts)
  - **Output**: `docs/api/openapi/contract-diff.md` + script proposal `scripts/openapi-contract-diff.ts`
  - **Must document**:
    - How each `schemas.ts` schema maps to an OpenAPI component (naming rule `<module>.<SchemaName>`), how nullable/optional are translated (e.g. provider limits nullable INT-021, `staff_id: null` alerts INT-022, zone geo nullable INT-031, `store-config.tracking` nullable INT-023).
    - The diff procedure: generate JSON Schema from Zod (`zod-to-json-schema`), compare against OpenAPI responses, fail on drift; run alongside `npm run lint`, `npx tsc --noEmit` and the Django suites of A.12.
    - Known shape changes made during Phase 002 that must be reflected (courier Ready rows INT-046, returns rows INT-026, B2B drafts INT-044, PWA rows #11/#13 INT-016).
  - **Done when**: the diff runs and reports zero drift for at least one module (reports, the first live module).

- [x] **DOC-010** — Structure the Postman collection per domain and module
  - **Source**: Part C traceability matrix · A.3
  - **Output**: `docs/api/postman/sharwa.postman_collection.json` + `docs/api/postman/README.md`
  - **Must document**:
    - Folder tree: 16 domain folders → module folders (M01–M49) → one request per route/method listed in the domain API docs; folder descriptions carry the module's gates and live key.
    - Separate top folders for the three origins (store host, platform origin, console) so cookies never mix (A.4 identities).
    - Saved example responses for success, 400 field errors, 401, 403 (plan feature / permission / owner-only), 404, 409 (conflict shapes of A.7), 429 with `Retry-After`.
    - Collection variables: `base_url`, `store_domain`, `console_url`, `platform_url`, `csrf_token`, `idempotency_key` (uuid per send).
  - **Done when**: the collection imports cleanly and every domain folder has at least one runnable request.

- [x] **DOC-011** — Provide Postman environments for every origin
  - **Source**: A.4, A.10 · INT-002, INT-030, INT-048
  - **Output**: `docs/api/postman/environments/local-store.json`, `local-console.json`, `local-platform.json`, `staging-*.json`
  - **Must document**:
    - Local tenant host (store subdomain against the local Django, or `X-Store-Domain` header override handled by `TenantHeaderOverrideMiddleware`); note that a session bound to one store refuses switching to another store.
    - Platform origin (public schema) for Sharwa Pay — store host or `X-Store-Domain` ⇒ 404 there; console origin (public schema) — 404 on a store host or with `X-Store-Domain`.
    - DEBUG-only values usable locally: POS manager code `2468` while none is set, POS refund OTP `123456` (INT-033) — clearly flagged as never valid in production.
  - **Done when**: a login + one authenticated GET succeeds in each environment.
  - **Status**: written in Step 02 (2026-10-27): 6 environments + smoke folders. Awaiting the live run by fares (`docs/api/overview/csrf.md#postman`, Newman commands) before ticking. **Closed in official Step 52 (2026-10-30)**: fares accepted the Step 51 live Newman run (`docs/api/_verification.md` §5.3: login + authenticated `GET` on store and console, platform-origin rows, 0 failures) as the acceptance; the `staging-*` environments are run when a staging host exists.

- [x] **DOC-012** — Write the Postman CSRF pre-request script and cookie handling guide
  - **Source**: A.4 (CSRF) · INT-003, INT-030, INT-048
  - **Output**: `docs/api/postman/csrf-pre-request.js` + `docs/api/overview/csrf.md` (Postman section)
  - **Must document**:
    - Pre-request on unsafe methods: `GET /api/v1/auth/csrf/` → `{csrfToken}` (Django `get_token`, Set-Cookie for the pair) → header `X-CSRFToken`; on a CSRF 403 refresh once and retry (same as `api-client.ts`).
    - `CSRF_COOKIE_HTTPONLY=True`: scripts must use the JSON body, never read the cookie.
    - Console: login answers the rotated `csrf_token` — store it after login; Sharwa Pay: CSRF required on every write including `otp/send` and `otp/verify`.
    - Cookie jar per origin; `sessionid` cycling (`cycle_key()` on Sharwa Pay login).
  - **Done when**: POST requests in all three origins succeed without manual token copy.
  - **Status**: written in Step 02 (2026-10-27); mechanics verified with Newman against a CSRF-enforcing stand-in. Awaiting the live run against Django (store, console; Sharwa Pay by hand) before ticking. **Closed in official Step 52 (2026-10-30)**: acceptance = the Step 51 live run — 1,300 unsafe requests on the three origins went through the pre-request script with 0 CSRF refusals (`docs/api/_verification.md` §5.3–§5.4); accepted by fares.

- [x] **DOC-013** — Source request/response examples from mock fixtures
  - **Source**: A.1, A.2 · `src/mocks/<module>`
  - **Output**: `docs/api/openapi/examples/` (one JSON file per operation) + note in `docs/api/openapi/README.md`
  - **Must document**:
    - Rule: examples are copied from `src/mocks/<module>` fixtures (which were aligned to Django during each INT task) and validated against the Zod schema before publishing; Arabic sample text kept.
    - List of fixtures explicitly aligned to Django in Phase 002 (variant-sum stock + `<sku>-<n>` SKUs INT-005; tracking texts INT-015; push messages INT-016; spend excluding cancelled INT-017; owed/clawback INT-034; reports statuses INT-027; locations `display_type` INT-025; others per domain doc).
    - Secrets never present in examples (`masked_hint` «••••» + last 4, write-only CAPI tokens, `whsec_…` shown as placeholder).
  - **Done when**: every documented operation has at least one example that parses with its Zod schema.

- [x] **DOC-014** — Define API versioning, deprecation and changelog policy
  - **Source**: A.13 (legacy-only features, superseded routes) · INT-003 (`account/stores` superseded)
  - **Output**: `docs/api/CHANGELOG.md` + `docs/api/overview/conventions.md#versioning`
  - **Must document**:
    - `/api/v1/` stability promise; how breaking changes are announced; how the Phase 002 baseline (2026-10-24 → 2026-10-26, INT-001…INT-049) is recorded as the first changelog entry with per-module dates.
    - Deprecated/superseded entries: BFF `account/stores` (no consumer, superseded by `merchant/stores/` INT-049); `AdminStoreSectionViewSet` router entry removed (INT-018); legacy HTML pages kept alongside APIs (e.g. `merchant/master-dashboard/`, `sharwa-pay/`).
  - **Done when**: the changelog has the Phase 002 baseline entry and the policy is approved.
  - **Status**: written in Step 02 (2026-10-27): `docs/api/CHANGELOG.md` baseline + `docs/api/overview/conventions.md#versioning`. Awaiting fares's approval of the policy. **Closed in official Step 52 (2026-10-30)**: fares approved the policy (`docs/api/overview/conventions.md#versioning` ☑); the changelog also records the removal of the BFF `account/stores` route (DOC-535).

### 1.2 Authentication & identity flows

Every caller identity of the platform, how it is established, and how CSRF and sessions behave.

- [x] **DOC-015** — Document the identity matrix
  - **Source**: A.4 · INT-003, INT-022, INT-030, INT-046, INT-048, INT-049
  - **Output**: `docs/api/overview/auth.md#identities`
  - **Must document**:
    - Storefront visitor: anonymous Django session on the store host carrying cart, `wishlist_phone`, booking holds, OTP keys, buy-now cart (used by Domain 5 and storefront rows of Domains 6/7/13).
    - Store owner: session flag `is_merchant_authenticated` + `auth_tenant_schema` pinned to the store; `MerchantSessionAuthentication` enforces CSRF on every write; owner implicitly holds every permission key.
    - Staff member: `auth/staff/login/` (phone + password), `StaffSession`, session pinned to the store, 15-min lockout, roster enforcement (INT-022); `request.staff` / `resolve_request_staff`; permissions from `permission_resolver`.
    - Courier agent: a staff session whose `shipping_provider_profile` is the agent; the owner gets 403 in the agent app (INT-046).
    - Platform console user: Django admin session on the public schema; superuser = «مالك المنصة», `is_staff` = «مشرف تشغيلي»; `ConsoleSessionAuthentication`.
    - Sharwa Pay customer: WhatsApp OTP on the platform origin, session key `sharwa_pay_auth_phone` shared with the legacy page, `cycle_key()` on login.
    - Multi-store owner: the store-owner session + the `MerchantAccount` linked to the current store (INT-049).
  - **Done when**: each identity has a sequence diagram and the list of domains it can call.
  - **Status**: written in Step 03 (2026-10-27): `docs/api/overview/auth.md#identities` (7-row matrix, per-identity Mermaid sequence, domains each can call).

- [x] **DOC-016** — Document the CSRF flow end to end
  - **Source**: A.4 (CSRF) · A.11 (CSRF bootstrap) · INT-030, INT-048
  - **Output**: `docs/api/overview/csrf.md`
  - **Must document**:
    - Django `CSRF_COOKIE_HTTPONLY=True` — the browser never reads cookies.
    - `GET /api/bff/auth/csrf` → Django `GET /api/v1/auth/csrf/` → `{csrfToken}` via `get_token`; Set-Cookie forwarded so the cookie/token pair matches.
    - `api-client.ts` sends `X-CSRFToken` on unsafe methods; refreshes once and retries on a CSRF 403.
    - The `(admin)` console layout bootstraps CSRF like the dashboard (INT-030); console login answers the rotated `csrf_token`.
    - Sharwa Pay enforces CSRF on every write including the OTP login; the client refreshes the token once on the CSRF 403 (INT-048).
    - `MerchantSessionAuthentication` enforces CSRF on every merchant write.
  - **Done when**: a developer can reproduce the flow with curl from the doc alone.
  - **Status**: written in Step 03 (2026-10-27): `docs/api/overview/csrf.md` (handshake end to end, who enforces it, curl walkthrough for store, console and Sharwa Pay).

- [x] **DOC-017** — Document merchant (store owner) login, logout, me and setup-password
  - **Source**: INT-003 (M03) · A.4 · Domain 2 · onboarding decision (setup token)
  - **Output**: `docs/api/domains/02-dashboard-shell/m03-auth.md#owner`
  - **Must document**:
    - Routes already live before INT-003: merchant login, logout, `auth/me/`, `auth/csrf/`, `setup-password` (paths under `/api/v1/auth/…`); login credentials = the store's WhatsApp phone + password (same as Django `merchant_login`).
    - First password of a new store: requires the short-lived signed setup token passed on the dashboard link after provisioning (`/register/status/<token>/` carries `setup_token`), so a new store cannot be claimed by whoever reaches it first.
    - Session established: `is_merchant_authenticated`, `auth_tenant_schema`; response shapes, 400/401 bodies; `/dashboard/me` on the BFF only flags fixture sessions as mock.
    - BFF: auth rows Django-first (no live key).
    - Tests: `api/test_dashboard_api.py`.
  - **Done when**: login → me → logout is documented with request/response examples.
  - **Status**: written in Step 03 (2026-10-27): `docs/api/domains/02-dashboard-shell/m03-auth.md#owner`.

- [x] **DOC-018** — Document staff login (`auth/staff/login/`)
  - **Source**: INT-003 (M03), INT-022 (M18) · A.4
  - **Output**: `docs/api/domains/02-dashboard-shell/m03-auth.md#staff`
  - **Must document**:
    - `POST /api/v1/auth/staff/login/` phone + password; creates `StaffSession` (with `device_label` such as «Chrome · Android», migration `0223_staff_api`); session pinned to the store; 15-minute lockout after failed attempts.
    - Phone matched across `967…` / `0…` / local forms (`customer_key` normalisation: 077… / 77… / 96777… are one number).
    - Roster enforcement (INT-022): a login outside the weekly `RosterSchedule` is refused (store timezone, weekday 0 = Sunday; no roster rows = no restriction) — closes the never-enforced `enforce_roster_schedule`.
    - Terminated staff (`terminated_at`, `is_active=False`, `token_version+1`) cannot log in; temporary password issued once on create / `reset-password/` (INT-022).
  - **Done when**: success, wrong password, lockout, terminated and out-of-roster responses are documented.
  - **Status**: written in Step 03 (2026-10-27): `docs/api/domains/02-dashboard-shell/m03-auth.md#staff`.

- [x] **DOC-019** — Document owner forgot/reset password
  - **Source**: INT-003 (M03)
  - **Output**: `docs/api/domains/02-dashboard-shell/m03-auth.md#password-reset`
  - **Must document**:
    - `POST /api/v1/auth/merchant/forgot-password/` → WhatsApp code sent to the store number; code stored as HMAC in cache (never plain); 3 sends per 10 minutes.
    - `POST /api/v1/auth/merchant/reset-password/` → code + new password; lock after 3 wrong codes.
    - 429 with `Retry-After` shapes; error messages.
  - **Done when**: both routes have examples for success, rate limit and lock.
  - **Status**: written in Step 03 (2026-10-27): `docs/api/domains/02-dashboard-shell/m03-auth.md#password-reset`.

- [x] **DOC-020** — Document tenant pinning and session-switch protection
  - **Source**: A.4 · INT-002 (M47) · INT-041 (console token pins `auth_tenant_schema`)
  - **Output**: `docs/api/overview/auth.md#tenant-pinning`
  - **Must document**:
    - `TenantHeaderOverrideMiddleware`: `X-Store-Domain` header override for local/dev; refuses switching a session bound to one store to another store; 404/403/503 from the middleware + `TenantProvisioningGuardMiddleware`.
    - `auth_tenant_schema` written by owner login, staff login and the Sharwa AI console-token route.
  - **Done when**: the doc explains every 404/403/503 a client can get before reaching a view.
  - **Status**: written in Step 03 (2026-10-27): `docs/api/overview/auth.md#tenant-pinning`. Discrepancy recorded: the Sharwa AI console-token route only reads `auth_tenant_schema`; it does not write it.

- [x] **DOC-021** — Document platform console authentication
  - **Source**: INT-030 (M20) · A.4 · Domain 16
  - **Output**: `docs/api/domains/16-platform-console/auth.md`
  - **Must document**:
    - `POST /api/v1/platform/auth/login/`, `logout/`, `GET me/` — Django admin session on the public schema only (404 on a store host or with `X-Store-Domain`).
    - `ConsoleSessionAuthentication`: no session ⇒ 401 with `WWW-Authenticate: Session`.
    - CSRF on login and every write; login answers the rotated `csrf_token`.
    - Lockout after 5 failures per username / 15 min; per-IP only a loose CGNAT ceiling (100).
    - Roles: superuser «مالك المنصة» (all writes), `is_staff` «مشرف تشغيلي» (reads everything, writes dues/Sharwa Pay only — FR-20.09); operator writes elsewhere → 403 «هذا الإجراء لمالك المنصة فقط.».
    - `getAdminSession()` reads Django `auth/me/` when live; every console action recorded in `PlatformActionLog` («من نفّذ», FR-20.07).
  - **Done when**: owner and operator login flows are documented with the 403 matrix.
  - **Status**: written in Step 03 (2026-10-27): `docs/api/domains/16-platform-console/auth.md`.

- [x] **DOC-022** — Document the Sharwa Pay customer session (auth summary)
  - **Source**: INT-048 (M40) · A.4
  - **Output**: `docs/api/overview/auth.md#sharwa-pay` (full routes live in the Domain 8 API doc)
  - **Must document**:
    - Platform origin only; `otp/send` → `otp/verify` → Django `sessionid` with `sharwa_pay_auth_phone` (in sync with the legacy page), `cycle_key()` on login; `logout` → 204.
    - Code bound to the requesting session, HMAC-stored; 3 sends / 10 min per number; 5 wrong codes → 5-min lock per number; 429 with `retry_after` + `Retry-After`; WhatsApp failure 502; reasons `no_code` / `expired` / `invalid`.
    - No session → 401 «سجّل الدخول برقم جوالك.»; every response `Cache-Control: no-store`; CSRF on every write.
  - **Done when**: the auth section links to the Domain 8 route reference.
  - **Status**: written in Step 03 (2026-10-27): `docs/api/overview/auth.md#sharwa-pay`, linking to Domain 8 `m40-sharwa-pay.md#auth` (page listed, not yet written).

- [x] **DOC-023** — Document courier-agent and multi-store-owner identity checks
  - **Source**: INT-046 (M38), INT-049 (M43) · A.4
  - **Output**: `docs/api/overview/auth.md#agent` and `#multi-store`
  - **Must document**:
    - Agent gate (mock verbatim): no session 401; owner 403 «هذا التطبيق لحسابات المندوبين…»; staff without a provider profile 403; inactive profile 403; owner may act for any agent via `agent_id`; `_agent_owns` ⇒ 404 on another agent's resources.
    - Multi-store owner: owner-only (staff 403 «هذه الصفحة لمالك المتجر فقط.», no owner session bound to this store 401); account = `MerchantAccount` linked to the current store.
  - **Done when**: both identities have their failure responses listed.
  - **Status**: written in Step 03 (2026-10-27): `docs/api/overview/auth.md#agent` and `#multi-store`.

- [x] **DOC-024** — Document personal access tokens
  - **Source**: INT-022 (M18) · migration `0223_staff_api`
  - **Output**: `docs/api/overview/auth.md#personal-access-tokens`
  - **Must document**:
    - `staff/<pk>/tokens/` (+ `<tid>/`): `PersonalAccessToken.name` / `last_used_at`; raw `shw_pat_…` returned once; SHA-256 stored; 90-day expiry; revoked on termination / revoke-sessions.
    - Open question to confirm in code: which API routes accept a PAT (document only what the code honours).
  - **Done when**: token lifecycle (create, list, revoke, expiry) is documented.
  - **Status**: written in Step 03 (2026-10-27): `docs/api/overview/auth.md#personal-access-tokens`. Finding: no route accepts a `shw_pat_…` token, so the lifecycle is documented as issued-but-unused. Awaiting fares's decision (build PAT authentication or keep as is).

- [x] **DOC-025** — Build the platform-wide OTP cross-reference table
  - **Source**: INT-003, INT-004, INT-014, INT-017, INT-028, INT-029, INT-033, INT-048 · A.4
  - **Output**: `docs/api/overview/otp.md`
  - **Must document** (one row per family: route, channel, storage, limits, lock, error codes, test):
    - Onboarding OTP: `verify-otp`, `resend-otp`; 410 when the pending registration is past Django's 30 min; 429 + `Retry-After`; 502.
    - Owner password reset: WhatsApp, HMAC in cache, 3 sends/10 min, lock after 3 wrong.
    - Checkout COD OTP: `checkout/cod-otp/send|verify/`; device tracker in public + session/phone limits; device id derived from the session when absent; `verify_cod_otp` answers `cod_allowed:false` for a store-disabled phone.
    - Checkout Sharwa Pay OTP: `checkout/sharwa-pay/otp/send/` (+ `display_balance`).
    - Wallet / loyalty OTP: `wallet/otp/send/`, `loyalty/otp/send/`, `loyalty/redeem/` (same WALLET_OTP session keys; marks the phone verified 10 min).
    - Engagement OTP: `customers/otp/send/` purposes `review|auction|wishlist|back_in_stock`, 60 s resend → 429; review POST consumes the code.
    - POS refund OTP: 428 + `OTPChallenge(large_refund)` above `pos_refund_otp_threshold`, store WhatsApp, 3 sends/10 min, 3 wrong → 429 15-min lock, DEBUG `123456`.
    - Sharwa Pay customer OTP: 3 sends/10 min per number, 5 wrong → 5-min lock.
    - Auction bids explicitly need no WhatsApp OTP (name + phone only, M37 decision).
  - **Done when**: every OTP-protected route in the platform appears in the table.
  - **Status**: written in Step 03 (2026-10-27): `docs/api/overview/otp.md` (8 families + the auction no-OTP note, storage comparison).

### 1.3 Cross-cutting API conventions

Rules every endpoint shares: gates, money, idempotency, conflicts, pagination, limits, headers, errors, uploads and normalisation.

- [x] **DOC-026** — Document the gate order and its status codes
  - **Source**: A.5
  - **Output**: `docs/api/overview/conventions.md#gates`
  - **Must document**:
    - Order: session (401) → plan feature (403, e.g. `{detail, code: feature_disabled}` on POS) → M18 permission key (403) → owner-only (403) → resource state (404/409); the owner implicitly holds every permission key.
    - Exceptions per module where the order differs (marketplaces/dropshipping check the permission before the plan feature — INT-038, INT-039; StaffChannelAccess applied inside the service — INT-037).
    - Single feature decision source: `billing.models.resolve_feature_decision` → `(enabled, decided_by)`; `_resolve_feature_enabled` takes `[0]` (INT-030).
  - **Done when**: each status code has an example body and the exception list is complete.
  - **Status**: written in run 04 = official Step 04 (2026-10-27): `docs/api/overview/conventions.md#gates` (flow diagram, status/body table, per-module gate-order table — seven orders found, not one).

- [x] **DOC-027** — Publish the plan-feature catalog mapped to modules
  - **Source**: A.5 (plan features)
  - **Output**: `docs/api/overview/plan-features.md`
  - **Must document** (code → modules/endpoints):
    - `contact_info`, `store_policies`, `shipping_settings`, `currency_settings`, `seo_settings`, `coupon`, `multi_location` (INT-010, INT-025); `storefront_design` (INT-018); `abandoned_carts`, `campaigns`, `timeline`, `loyalty_settings`, `gift_settings` (INT-019, INT-028); `payment_gateways`, `local_wallets`, `bank_transfers`, `merchantwallet` (INT-020); `shipping_companies`, `pickuplocation`, `shipping_providers` (INT-021, INT-047); `staff_rbac` (INT-022); `tracking_tools` (INT-023); `inventory` (INT-024); `refunds` (INT-026); `customer_wallets` (INT-028); `pos` (new, INT-033 — `requires_plan=True`, open to all while subscriptions are off, migration `billing/0013_seed_pos_feature`); `social_channels` (INT-037); `marketplaces` (INT-038); `dropshipping` (INT-039); `app_marketplace` (INT-040, INT-041); `bookings` (INT-036); `sharwa_ship` (INT-030, INT-047).
    - Ungated by design: dues and `store/payments` (INT-020), procurement (INT-035), support (INT-042), expenses (INT-043).
    - The legacy `require_feature` / `settings_feature_enabled` codes are the same ones.
  - **Done when**: every code has at least one endpoint link.
  - **Status**: written in run 04 = official Step 04 (2026-10-27): `docs/api/overview/plan-features.md` (40 codes seeded vs 32 listed, sub-tables per module group, `#ungated` codes, modules without a plan gate).

- [x] **DOC-028** — Publish the M18 permission-key catalog mapped to endpoints
  - **Source**: A.5 (permission keys) · INT-022
  - **Output**: `docs/api/overview/permissions.md`
  - **Must document** (key → endpoints):
    - `orders.view`, `orders.update_status`, `orders.process_returns`, `orders.refund`, `orders.create_b2b`, `orders.approve_b2b`, `customers.view`, `customers.edit_profile`, `catalog.manage`, `discounts.apply`, `discounts.manage`, `inventory.view`, `inventory.adjust`, `inventory.writeoff`, `reports.view`, `reports.sales.view`, `reports.export`, `staff.view`, `staff.manage`, `staff.manage_roles`, `staff.manage_assignments`, `staff.view_sessions`, `suppliers.manage`, `suppliers.approve`, `channels.inbox.access`, `channels.marketplaces.manage`, `channels.dropshipping.manage`, `support.takeover_session`, `expenses.manage` (new — INT-043, category «المالية», seeded to «مدير المتجر» + «مدير الفرع», migration `0235_seed_expenses_permission`).
    - Role-based extras: `Role.max_discount_percent` (POS ceiling), approver roles on `ApprovalRequest`, «مدير الفرع|المتجر» for POS variance.
    - Effective permissions = `permission_resolver` order (active location roles ∪, then global + that location's overrides).
  - **Done when**: every key links to at least one endpoint and to its seeded roles.
  - **Status**: written in run 04 = official Step 04 (2026-10-27): `docs/api/overview/permissions.md` (36 keys mapped to routes, system roles, POS ceiling and approvals, sensitive keys, behaviour limits, keys no route uses).

- [x] **DOC-029** — List the owner-only areas
  - **Source**: A.5 (owner-only areas)
  - **Output**: `docs/api/overview/permissions.md#owner-only`
  - **Must document**:
    - Store settings money/structure sections; design (M08); carts/campaigns/timeline/loyalty/gifting (M13); payments & merchant wallet (M14); shipping settings (M15); locations structure (M22); domains & integrations (M19); affiliate/influencer writes (M17); channel settings (M27); app installs and template edits (M30); Sharwa AI writes / console token (M31); Sharwa Ship writes + supervision (M39); multi-store rollup (M43); push broadcast (M44).
    - The exact staff 403 sentence of each area (e.g. «تصميم المتجر مقصور على مالك المتجر.», «إعدادات الشحن مقصورة على مالك المتجر.», «إدارة المواقع مقصورة على مالك المتجر.», «إدارة المسوّقين والمؤثرين ومستحقاتهم لمالك المتجر.», «إعدادات القنوات لمالك المتجر فقط.», «هذا الإجراء مقصور على مالك المتجر.», «هذه الصفحة لمالك المتجر فقط.», `<what> مقصورة على مالك المتجر.`).
  - **Done when**: the list matches the code and every sentence is verbatim.
  - **Status**: written in run 04 = official Step 04 (2026-10-27): `docs/api/overview/permissions.md#owner-only` (owner-only sentences per area).

- [x] **DOC-030** — Document money representation and formatting
  - **Source**: A.6
  - **Output**: `docs/api/overview/money.md`
  - **Must document**:
    - Every amount crosses the API as a server-formatted string `display_*` produced by `products.models.base.format_money`; the browser never parses, sums or re-formats money (`displayMoney = z.string()`).
    - Rules: SAR → «1,250 ر.س» integral, «12.50 ر.س» otherwise; USD → «$1» / «$12.50»; YER_OLD / YER_NEW → rounded integer «… ر.ي».
    - Currencies: `SAR`, `USD`, `YER_OLD` («ريال يمني (صنعاء)»), `YER_NEW` («ريال يمني (عدن)»).
    - Totals per currency, never summed across currencies (INT-020 dues «2.50 ر.س · $1», INT-033 POS store currency, INT-043 expenses month totals, INT-048 four Sharwa Pay rows).
    - Fix history: card `display_price`/`display_old_price` use `format_money` because legacy `get_formatted_price` dropped «ر.ي» for YER (INT-012).
  - **Done when**: every currency has formatted examples.
  - **Status**: written in run 04 = official Step 04 (2026-10-27): `docs/api/overview/money.md` (currencies, wire formats, `format_money`, per-currency totals, exchange rates, worked examples).

- [x] **DOC-031** — Document currency conversion rules per module
  - **Source**: A.6 (conversion)
  - **Output**: `docs/api/overview/money.md#conversion`
  - **Must document**:
    - Storefront money via `_convert_value_to_target` with `?currency=` (INT-012).
    - Free-shipping threshold compared in the dashboard currency (`build_order_invoice`, INT-013).
    - FX rates stored with 4 decimals (migration `0217_storesetting_fx_rate_precision`, INT-010; e.g. `3.7525`; `fx_preview` for 100 SAR).
    - POS converts to the store currency (INT-033); dropshipping uses `StoreSetting.usd_to_sar` as the «daily» rate (INT-039); affiliate amounts stored in SAR, shown in store currency (INT-034); customer wallet always SAR (FR-07.04); marketplaces price = override else store price → SAR → × fx → × (1 + markup) (INT-038); customer LTV converted to dashboard currency (INT-017); B2B draft lines converted from product currency to draft currency (INT-044); auction bids compared in the buyer's currency with the product's own rate (INT-045); chat-to-order in store currency (INT-037); procurement unit cost in order currency = store currency at creation (INT-035).
  - **Done when**: each module that converts money is listed with its rule.
  - **Status**: written in run 04 = official Step 04 (2026-10-27): `docs/api/overview/money.md#conversion` (two engines, per-module table).

- [x] **DOC-032** — Document idempotency mechanisms
  - **Source**: A.7 (idempotency)
  - **Output**: `docs/api/overview/idempotency.md`
  - **Must document**:
    - Checkout `client_uuid` → unique `Order.idempotency_key` inside the reservation transaction (INT-014).
    - Merchant withdrawal `Idempotency-Key` (INT-020) — retried POST returns the same request (200) with no second debit.
    - Customer wallet top-up `Idempotency-Key` header/body (INT-028, unique `WalletTransaction.idempotency_key`).
    - POS `PosIdempotencyKey` inserted first in the write transaction (INT-033).
    - Inbox reply `client_id` unique or `Idempotency-Key` (INT-037); support reply `client_id` unique per session (INT-042).
    - Campaign send flips status under a row lock first (INT-019); order push throttle one per (order, kind) per 6 h (INT-016).
    - Status codes: replay = 200 with the first result vs 201 for the first write.
  - **Done when**: each mechanism has header/body name, scope and replay response.
  - **Status**: written in run 04 = official Step 04 (2026-10-27): `docs/api/overview/idempotency.md` (15 mechanisms, one section per family, choosing keys).

- [x] **DOC-033** — Document optimistic locking and 409 conflict shapes
  - **Source**: A.7 (optimistic locking)
  - **Output**: `docs/api/overview/conflicts.md`
  - **Must document**:
    - Orders `select_for_update` + `version` → `{detail, current_version, order}` (INT-007); theme `version` → `{detail, current_version}` (INT-018); convert-to-pickup → `{detail, current_version, status}` (INT-021); approvals `ApprovalRequest.resolve()` (INT-022); returns `{detail, current_version}` (INT-026); POS shift `version` (INT-033); purchase orders «حُدِّث الأمر من مستخدم آخر.» (INT-035); support session → `{detail, session}` (INT-042); Sharwa Ship detail `version` = accepted transitions + 1, no column (INT-047).
    - Row locks before every money decision: console dues/top-ups/withdrawals (INT-031), merchant withdrawal decisions (INT-020), auctions (INT-045), Sharwa Pay `SharwaPayWalletManager` (INT-048), import jobs (INT-045).
    - Other 409 families (state conflicts): checkout `{detail, changed}`, auction `{detail, auction}`, «عطّلها بدل الحذف» deletes, PROTECT deletes.
  - **Done when**: client retry guidance is written for each shape.
  - **Status**: written in run 04 = official Step 04 (2026-10-27): `docs/api/overview/conflicts.md` (two kinds of 409, version-conflict and state-conflict tables, row locks, recovery sheet).

- [x] **DOC-034** — Document pagination and list conventions
  - **Source**: INT-009, INT-024, INT-026, INT-028, INT-029, INT-030, INT-032, INT-035, INT-043, INT-046, INT-048
  - **Output**: `docs/api/overview/pagination.md`
  - **Must document**:
    - Envelopes in use: `{count, results}`, `{count, counts, results}`, `{count, months:[…]}` (expenses), `{topups[], withdrawals[]}`; params `page` / `page_size`.
    - Page sizes in use: 20 (Sharwa Pay transactions), 50 (expenses, courier custody), 5 (PDP reviews), 30-day notification window with `history=1`, last 50 stores (console overview), newest 50 (Sharwa Ship pending orders), last 100 movements (console wallets), 20 preview rows (CSV import).
    - Opaque cursors: support timeline `"<last message>.<last tool call>"`, inbox `messages?after`.
  - **Done when**: every list endpoint states its envelope and default size.
  - **Status**: written in run 04 = official Step 04 (2026-10-27): `docs/api/overview/pagination.md` (five envelopes, per-module table, fixed windows, cursors, client rules).

- [x] **DOC-035** — Document rate limits, 429 and the CGNAT stance
  - **Source**: A.4, A.11 · INT-003, INT-014, INT-016, INT-029, INT-030, INT-033, INT-036, INT-039, INT-048
  - **Output**: `docs/api/overview/rate-limits.md`
  - **Must document**:
    - Stance: Yemeni ISPs use CGNAT, so limits are per phone number / session; per-IP limits are only loose ceilings.
    - Inventory: PWA install-event 300/min per IP (was 30); push subscribe 120/min; console login IP ceiling 100; checkout 429 within a minute of the last order; COD OTP device/session/phone limits; push test 429 + `Retry-After` within 60 s; store reviews 3 per session/hour; `customers/otp/send` 60 s resend; booking holds 10 live per session; Sharwa Pay 3 sends/10 min + 5 wrong/5-min lock; owner reset 3 sends/10 min; staff 15-min lockout; customer export 429 on hard limit or critical alert; dropshipping connect 429 from supplier rate limit; onboarding 429 + `Retry-After`.
    - Body/header shape: `Retry-After` header, `retry_after` body field (Sharwa Pay).
  - **Done when**: every limited route is in the table.
  - **Status**: written in run 04 = official Step 04 (2026-10-27): `docs/api/overview/rate-limits.md` (CGNAT stance, `Retry-After` vs `retry_after`, every limited route with its number, generic DRF throttle).

- [x] **DOC-036** — Document caching and security headers
  - **Source**: INT-001, INT-015, INT-041, INT-048, INT-039, INT-040
  - **Output**: `docs/api/overview/conventions.md#headers`
  - **Must document**:
    - `public/plans/`, `public/stats/` cached 1 h; tracking `Cache-Control: no-store` + `X-Robots-Tag: noindex`; Sharwa Pay every response `no-store`; console token `no-store` + `Referrer-Policy: no-referrer`; dropshipping webhook rotate `no-store`; WhatsApp `connect-url/` `no-store`; past report days cached 1 h.
    - Response headers forwarded by the BFF: `x-sharwa-mock`, `x-export-rows`, Set-Cookie for CSRF.
  - **Done when**: header table is complete.
  - **Status**: written in run 04 = official Step 04 (2026-10-27): `docs/api/overview/conventions.md#headers` (caching and security headers; ETag/`If-None-Match` found inert).

- [x] **DOC-037** — Document error body shapes
  - **Source**: A.2, A.5, A.7 · INT-004, INT-026, INT-033
  - **Output**: `docs/api/overview/errors.md`
  - **Must document**:
    - `{detail}`; field errors `{field:[msg]}` (mock messages verbatim); nested per-line `{line_items:[{quantity_returned:[…]}]}`; per-row `{results:[{field:[msg]}]}` (bookings availability); `{code}`; `{detail, code: feature_disabled}`; `{detail, level}` (console dues); `{codes, duplicates}` (serials); `CashLiquidityError: …` 400.
    - Status codes: 400, 401 (with `WWW-Authenticate: Session` on console), 403, 404, 405 (expenses edit/delete, mock non-GET agent), 409, 410 (onboarding), 428 (POS refund OTP), 429, 501 «غير متاح بعد.» (mocks off, no endpoint), 502 (WhatsApp/upstream failure), 503 (dnspython unavailable, Sharwa AI SSO keys missing).
  - **Done when**: every status code has an example and the screens that consume it.
  - **Status**: written in run 05 = official Step 04 (2026-10-27): `docs/api/overview/errors.md` (13 body shapes, every status code with an example and the consuming screens, `ApiError` parsing rules, client defaults). Screens that consume `401`, `405` and `503` were not found in the code read; the page says so.

- [x] **DOC-038** — Document upload limits and file rules
  - **Source**: A.10 · INT-005, INT-010, INT-014, INT-018, INT-031, INT-039, INT-045, INT-048
  - **Output**: `docs/api/overview/conventions.md#uploads`
  - **Must document**:
    - `DATA_UPLOAD_MAX_MEMORY_SIZE` = 8 MB bounds BFF buffering and multipart publishes (production Nginx `client_max_body_size 8M`).
    - Base64 data-URL images (product images, SEO image `Base64ImageField`, theme logo, section item images jpg/png/webp/gif ≤ 5 MB stored as files under `<schema>/store_sections/`).
    - Checkout receipts JPEG/PNG only (`validate_receipt_image`); Sharwa Pay receipts jpg/jpeg/png/webp/gif ≤ 5 MB and a real image (Pillow).
    - CSV/feeds: csv/tsv/txt/xlsx, UTF-8 or Windows-1256, sniffed delimiter, ≤ 20,000 rows.
    - Non-ASCII filenames stored under a uuid name (`tenant_upload_path`).
  - **Done when**: every upload route lists its accepted types and size.
  - **Status**: written in run 05 = official Step 04 (2026-10-27): `docs/api/overview/conventions.md#uploads` (per-route table, import and feed reader limits). The 8 MB "BFF buffering" bound is Nginx/Django, not the BFF (see discrepancy in the page).

- [x] **DOC-039** — Document Arabic search normalisation and phone normalisation
  - **Source**: A.11 · INT-008, INT-017, INT-022, INT-048
  - **Output**: `docs/api/overview/conventions.md#normalisation`
  - **Must document**:
    - Shared Arabic normalisation: `src/lib/i18n/normalize.ts` ↔ Python (same rules and code-point ranges) ↔ PostgreSQL `lower(translate(…))`; used by search, catalog, inventory, locations, customers, wallets.
    - Phones: `clean_phone_number`; `customer_key` (+ `966` for 9-digit Saudi mobiles, Arabic digits accepted); Sharwa Pay mirrors frontend `normalizePhone` (local Yemeni → 967…, 966/967 kept); local `0777…` accepted in console and wallet search; affiliate phone `^(967|966)\d{9}$`.
  - **Done when**: examples of equivalent inputs are listed.
  - **Status**: written in run 05 = official Step 04 (2026-10-27): `docs/api/overview/conventions.md#normalisation` (Arabic rules, SQL/Python/TypeScript parity, four phone normalisers, equivalent-input tables).

### 1.4 BFF layer reference (Next.js `/api/bff/*`)

How the Next.js BFF forwards to Django, falls back to fixtures, and which live key switches which rows.

- [x] **DOC-040** — Document the `liveOrMock` / `forwardLive` switch
  - **Source**: A.2 · A.11
  - **Output**: `docs/api/overview/bff.md#liveormock`
  - **Must document**:
    - `src/lib/bff/live-route.ts`; mock mode → fixture handler unchanged with `x-sharwa-mock: 1`; live when `SHARWA_MOCKS=off` or the module is in `SHARWA_LIVE_MODULES` (`*` = all).
    - Live = transparent passthrough to `upstreamPath`: query string, cookies, CSRF header, status and body forwarded verbatim; Django answers 401/403 itself (no Next-side session gate).
    - Write bodies buffered (Content-Length; 8 MB max).
    - Successful live write on a store host calls `revalidateTag(storeTag(store))` to drop cached storefront reads, like `mockRoute`.
  - **Done when**: one worked example per HTTP method exists.
  - **Status**: written in run 05 = official Step 05 (2026-10-27): `docs/api/overview/bff.md#liveormock` (switch, flow, `forwardLive`, BFF-own answers, GET/POST/PATCH/DELETE from the reports routes and PUT from the platform catch-all).

- [x] **DOC-041** — Document the products rule tables
  - **Source**: A.2 · INT-005, INT-044, INT-045
  - **Output**: `docs/api/overview/bff.md#products-rules`
  - **Must document**:
    - `src/lib/bff/live-products.ts`: `PRODUCTS_LIVE_RULES` (`products`), `B2B_LIVE_RULES` (`b2b`: `products/<id>/extras/tier-prices[/<tier_id>]`), `ADVANCED_LIVE_RULES` (`advanced_products`: M37 extras, import ×3, `export.csv` → `/api/v1/products/export/`); dispatched by `dispatchLiveProducts` called first by `mockRoute`, before any mock gate; each table independent.
    - «تطبيق على منتجات» stays BFF-orchestrated (decision D7).
  - **Done when**: every rule row lists BFF path → Django path.
  - **Status**: written in run 05 = official Step 05 (2026-10-27): `docs/api/overview/bff.md#products-rules` (21 + 2 + 14 rows, dispatch order, `applyTemplateLive`).

- [x] **DOC-042** — Document the platform catch-all grouping
  - **Source**: A.2 · INT-030, INT-031, INT-032
  - **Output**: `docs/api/overview/bff.md#platform`
  - **Must document**:
    - `app/api/bff/platform/[...path]` live per row group: `platform` (M20), `platform_money` (`dues`, `sharwa-pay`, `sharwa-ship`), `platform_billing` (M46 rows).
  - **Done when**: each console path prefix is mapped to its group.
  - **Status**: written in run 05 = official Step 05 (2026-10-27): `docs/api/overview/bff.md#platform` (host gate, 3 groups, every Django route mapped by first segment).

- [x] **DOC-043** — Document the Django-first adapters
  - **Source**: A.2
  - **Output**: `docs/api/overview/bff.md#django-first`
  - **Must document**:
    - Server fetchers `getPublicJson`, `getProduct()`, `getTracking()`, `probeStore()`, landing-page fetchers: Django wins as soon as it answers; fixture only on 404/405/501 or Django down; no switch (INT-001, INT-002, INT-011, INT-012, INT-015).
    - `storefrontAdapter` for storefront BFF rows (INT-011 → INT-015, INT-028 five storefront rows, INT-029, INT-034 referral, INT-036 buyer rows, INT-045 auction + bids).
    - `tryTarget` / `tryStoreTarget` / legacy adapter (INT-003 counters/overview/refresh, INT-004 onboarding).
  - **Done when**: every consumer is listed per adapter.
  - **Status**: written in run 06 = official Step 05 (2026-10-27): `docs/api/overview/bff.md#django-first` (adapter table, the "not shipped" rule 404/405/501, every server fetcher, `storefrontAdapter` consumers per INT task, `tryTarget` / `tryStoreTarget` / `tryTargetAuth` / legacy consumers). 46 deeply nested BFF route files could not be read; their adapter is taken from the BFF README and flagged in the page.

- [x] **DOC-044** — Document the `/api/v1/*` passthrough and the «Ready» list
  - **Source**: A.2, A.11, A.13
  - **Output**: `docs/api/overview/bff.md#passthrough`
  - **Must document**:
    - Rows marked «Ready» in `ready-api-v1.md` go straight to Django; fixture fallback on 404/unreachable; writes only reach Django with a body since the `upstream.ts` buffering fix.
    - Users: cart `/api/v1/cart*` (INT-013), PWA rows #11–#14 (INT-016), returns «Ready» rows (INT-026), B2B draft rows (INT-044), the five courier actions (INT-046).
    - Known inconsistency: rows #11/#13 updated in INT-016; other Ready rows changed shape in INT-026/INT-044/INT-046 — the Ready list must be re-audited and the doc must reflect the audited result.
  - **Done when**: the Ready list is re-audited and mirrored in the doc.
  - **Status**: written in run 06 = official Step 05 (2026-10-27): `docs/api/overview/bff.md#passthrough` (behaviour, callers, 30-row re-audited «Ready» table). The «Ready» list in `ready-api-v1.md` is stale for rows #1, #3–5, #7–10 and #15–29 (discrepancy in the page).

- [x] **DOC-045** — Document the mock runtime
  - **Source**: A.2 (mock runtime)
  - **Output**: `docs/api/overview/bff.md#mock-runtime`
  - **Must document**:
    - `src/mocks/runtime.ts`: `isMocksOn()` (`SHARWA_MOCKS=on|off`, default on outside production), `isModuleLive(module)`, `notAvailable()` → 501 «غير متاح بعد.» when mocks are off and no endpoint exists; `x-sharwa-mock: 1` on every mocked response.
    - Mock E2E scripts must run with `SHARWA_LIVE_MODULES=none`; Windows cmd `set SHARWA_LIVE_MODULES=none&& npm run dev` (note `set X=` deletes the variable); `scripts/b2b-check.ts` `requireMocks()` preflight checks the `x-sharwa-mock` header.
    - Fixture-only rows that never go live: `pos/__reset`, `inbox/_mock/*`, `b2b/_test/bump`, mock agent non-GET → 405.
  - **Done when**: a developer can switch a single module live/mock from the doc.
  - **Status**: written in run 06 = official Step 05 (2026-10-27): `docs/api/overview/bff.md#mock-runtime` (`runtime.ts` functions, `x-sharwa-mock` meanings, how to switch a module, fixture-only routes, `b2b-check.ts` `requireMocks()`).

- [x] **DOC-046** — Document the request-buffering fix and forwarded headers
  - **Source**: A.11 · INT-044, INT-046, INT-017
  - **Output**: `docs/api/overview/bff.md#buffering`
  - **Must document**:
    - Bug: streamed bodies went out chunked with no Content-Length, Django read an EMPTY body; every passthrough write answered 400 «required field» (e.g. `POST /api/v1/pwa/install-event/`).
    - Fix in `src/lib/bff/upstream.ts` + `forwardLive`: bodies buffered (`null` when empty or already used; `duplex: "half"` only for an explicit stream).
    - Forwarded response headers include `x-export-rows` (INT-017).
  - **Done when**: the fix and its regression symptoms are documented.
  - **Status**: written in run 06 = official Step 05 (2026-10-27): `docs/api/overview/bff.md#buffering` (symptom, `bufferedBody()` / `duplex` fix in `upstream.ts` and `live-route.ts`, request and response header lists incl. `x-export-rows`).

- [x] **DOC-047** — Publish the live-key ↔ BFF-row ↔ Django-route map
  - **Source**: A.3 (all 39 keys) · Part C
  - **Output**: `docs/api/overview/bff.md#live-keys`
  - **Must document** (key · task · module · rows):
    - `reports` INT-027 9 rows → `api/views_reports.py`; `catalog` INT-006 15 rows → `api/views_catalog.py`; `products` INT-005 Phase A via `PRODUCTS_LIVE_RULES`; `orders` INT-007 11 rows (print reuses detail); `search` INT-008 `/api/bff/search`; `notifications` INT-009 4 rows; `settings` INT-010 `settings` + 9 section rows (`settingsWrite(upstream, …)`); `pwa` INT-016 `push/stats` + `push/test`; `customers` INT-017 13 rows; `design` INT-018 6 rows (multipart as-is); `marketing` INT-019 18 rows; `payments` INT-020 11 rows; `shipping` INT-021 25 rows (incl. Sharwa Ship zones list); `staff` INT-022 25 rows + reset-password row; `integrations` INT-023 13 rows; `inventory` INT-024 8 handlers; `locations` INT-025 14 handlers; `returns` INT-026 4 rows; `wallets` INT-028 7 merchant rows; `platform` INT-030; `platform_money` INT-031; `platform_billing` INT-032; `pos` INT-033 `api/bff/pos/[...path]`; `affiliates` INT-034 both catch-alls `/api/v1/<kind>/<path>/`; `procurement` INT-035 both catch-alls `/api/v1/<resource>/<path>/`; `bookings` INT-036 `api/bff/bookings/[...path]`; `channels` INT-037 `inbox/[...path]` + `channels/[[...path]]`; `marketplaces` INT-038; `dropshipping` INT-039; `apps` INT-040 (except `sharwa-ai/*`); `sharwa_ai` INT-041; `support` INT-042; `expenses` INT-043; `b2b` INT-044 (`b2b/options` + tier prices); `advanced_products` INT-045; `courier` INT-046 (4 reads); `sharwa_ship` INT-047 (7 routes `shipping/{sharwa-ship,shipments,awb-queue,rate-cards,supervisor,agents,agent-shifts}`); `sharwa_pay` INT-048 (platform origin only); `rollup` INT-049 `/api/bff/merchant/stores`.
    - No-switch (Django-first) list: INT-001, INT-002, INT-003 counters/overview/refresh + auth, INT-004, INT-011 → INT-015, INT-016 passthrough rows, INT-028/029/034/036/045 storefront rows, INT-044 draft rows, INT-046 courier actions.
    - Recommended production value of `SHARWA_LIVE_MODULES` (`*` or the full list) and `SHARWA_MOCKS=off`.
  - **Done when**: the table has 39 rows and matches `.env.example` after its fix.
  - **Status**: written in run 06 = official Step 05 (2026-10-27): `docs/api/overview/bff.md#live-keys` (39 keys → BFF rows → Django routes, no-switch list, recommended production values). Discrepancies: `.env.example` lists 35 keys (missing `inventory`, `locations`, `returns`, `wallets`); `src/app/api/bff/README.md` is stale.

### 1.5 Domain 1 API — Public site, onboarding & tenant resolution

Everything reachable without a merchant session; all Django-first (no live key).

- [x] **DOC-048** — Document the public landing-page API (plans, stats)
  - **Source**: INT-001 (M01) · Domain 1
  - **Output**: `docs/api/domains/01-public-onboarding/m01-landing.md`
  - **Must document**:
    - `GET /api/v1/public/plans/`, `GET /api/v1/public/stats/` — provider `api/views_public.py`; cached 1 h; no auth.
    - Adapters: server fetchers + BFF fallback (Django-first); free-plan features fall back to `freePlanHighlights` when a live plan lists none.
    - Response fields per the Zod schema; tests `api/test_public_api.py`.
  - **Done when**: both routes have examples.
  - **Status**: written in run 06 = official Step 11 (2026-10-27): `docs/api/domains/01-public-onboarding/m01-landing.md` (plans, stats, feature-listing rules, Next vs Django caching). Discrepancy: only stats are cached in Django (3600 s); plans are cached only by Next.

- [x] **DOC-049** — Document the tenant config probe and guard
  - **Source**: INT-002 (M47) · Domain 1
  - **Output**: `docs/api/domains/01-public-onboarding/m47-tenant-guard.md`
  - **Must document**:
    - `probeStore()` hits Django `/api/v1/config/` directly; 404 / 403 / 503 come from `TenantHeaderOverrideMiddleware` + `TenantProvisioningGuardMiddleware` (meaning of each).
    - BFF status route reads `/register/status/<token>/` (setup_token, forwarded host); passthrough serves `HEAD`.
    - Status «Already Integrated»; tests `api/test_tenant_guard_api.py` lock the probe contract.
  - **Done when**: each status code maps to a storefront behaviour.
  - **Status**: written in run 06 = official Step 11 (2026-10-27): `docs/api/domains/01-public-onboarding/m47-tenant-guard.md` (gate chain, `/config/` probe, `probeStore` outcomes, HEAD poll, 2026-09-16 and 2026-10-20 fixes). Open item: a `failed` store also answers 503 and maps to "provisioning".

- [x] **DOC-050** — Document the `/api/v1/config/` payload and its extensions
  - **Source**: INT-002, INT-010, INT-019, INT-023, INT-018 · Domain 1/12
  - **Output**: `docs/api/domains/01-public-onboarding/config.md`
  - **Must document**:
    - Base config + sections (section types identical to the contract; `StoreSection.label` returned, else the type name — INT-018).
    - Extensions that were `[NEEDS BACKEND]` in `store-config.ts` and their owners: INT-010 M34 (card border, announcement colours/speed/page flags/banner flags, free-shipping threshold, currency, SEO + absolute OG image, contact links, about/return policy, timezone, week start) via `StoreConfigSerializer`; INT-019 M13 (gifting, loyalty); INT-023 M19 (`tracking` = public ids only, null when off or not in plan).
    - Next-owned consumers: manifest, `/icon`, `/sw.js` built from `/config/` (R-16).
  - **Done when**: every config field is documented with its owner module.
  - **Status**: written in run 06 = official Step 11 (2026-10-27): `docs/api/domains/01-public-onboarding/config.md` (40 emitted fields with owners, sections/`label` fallback, caching, manifest / `/icon` / `/sw.js`). Discrepancy: `gifting_enabled` / `loyalty_enabled` are in the Zod schema but Django never emits them.

- [x] **DOC-051** — Document onboarding market categories and register
  - **Source**: INT-004 (M02) · Domain 1
  - **Output**: `docs/api/domains/01-public-onboarding/m02-onboarding.md#register`
  - **Must document**:
    - Provider `api/views_onboarding.py`: `market-categories`, `register`; categories administered in the console (M46 `market-categories/`, INT-032).
    - Subdomain rule 3–50 characters (Django shared validator + frontend `SUBDOMAIN_MAX`); legacy `/register/check-subdomain/`.
    - Contract statuses: 400 `{field}` / `{code}`, 410, 429 + `Retry-After`, 502; BFF Django-first (`tryTarget` / legacy adapter), fixture only when route missing or Django down.
  - **Done when**: register request/response and every error status are documented.
  - **Status**: written in run 06 = official Step 11 (2026-10-27): `docs/api/domains/01-public-onboarding/m02-onboarding.md#register` (market categories, legacy `check-subdomain`, register body/response, every error status, limits).

- [x] **DOC-052** — Document onboarding OTP verify/resend
  - **Source**: INT-004 (M02)
  - **Output**: `docs/api/domains/01-public-onboarding/m02-onboarding.md#otp`
  - **Must document**:
    - `verify-otp`, `resend-otp`; 410 when the pending registration is past Django's 30 min.
    - UX fix in `otp-form.tsx`: a resend answered 410 returns to panel 01 with the draft kept instead of a dead end.
    - Tests `api/test_onboarding_api.py`.
  - **Done when**: the 410 recovery path is documented.
  - **Status**: written in run 06 = official Step 11 (2026-10-27): `docs/api/domains/01-public-onboarding/m02-onboarding.md#otp` (verify, resend, lock-out, debug code, the INT-004 resend-410 recovery in `otp-form.tsx`, tests). Discrepancy: mock OTP lifetime/lock-out differ from Django.

- [x] **DOC-053** — Document provisioning status polling
  - **Source**: INT-002, INT-004, INT-030 · Domain 1/16
  - **Output**: `docs/api/domains/01-public-onboarding/m02-onboarding.md#provisioning`
  - **Must document**:
    - `/register/status/<token>/` (legacy route, outside `/api/v1/`): provisioning states, `setup_token` for the first-password link, forwarded host.
    - Backend: `queue_provisioning` / `provision_tenant_schema`; sweeper thresholds pending > 5 min / provisioning > 20 min = stalled (re-provisioned from the console, INT-030).
  - **Done when**: the status lifecycle diagram is published.
  - **Status**: written in run 06 = official Step 11 (2026-10-27): `docs/api/domains/01-public-onboarding/m02-onboarding.md#provisioning` (status route, `setup_token`, forwarded host, queue/Celery/sweeper, console reprovision, poller policies, lifecycle diagram). Discrepancy: the BFF turns a Django 429/400/5xx into a final 404.

### 1.6 Domain 2 API — Dashboard shell, overview, search, notifications & multi-store

- [x] **DOC-054** — Document dashboard overview, refresh and counters
  - **Source**: INT-003 (M03) · Domain 2
  - **Output**: `docs/api/domains/02-dashboard-shell/m03-overview.md`
  - **Must document**:
    - `GET /api/v1/dashboard/overview/`, `POST overview/refresh/`, `GET dashboard/counters/` — `products/services/dashboard_service.py`, `api/views_dashboard.py`.
    - Today = `DailyStoreMetrics`; refresh shares the M25 5-minute cooldown (same cache key as reports refresh); low stock = `product_service.low_stock_count()`; staff blocks zeroed per permission; refresh needs `reports.sales.view` for staff.
    - BFF Django-first `tryStoreTarget`, fixture only when route missing or Django down.
    - Tests `api/test_dashboard_api.py`.
  - **Done when**: owner vs staff responses are both documented.
  - **Status**: written in run 06 = official Step 11 (2026-10-27): `docs/api/domains/02-dashboard-shell/m03-overview.md` (overview, refresh, counters, owner vs staff matrix, shared 5-minute cooldown, tests).

- [x] **DOC-055** — Document the superseded `account/stores` route
  - **Source**: INT-003, INT-049 · A.13
  - **Output**: `docs/api/domains/02-dashboard-shell/m03-overview.md#deprecated`
  - **Must document**:
    - `account/stores` BFF route superseded by M43 `/merchant/stores/` (switcher + ⌘K use `useLinkedStores`); no consumer; removal candidate.
  - **Done when**: the deprecation is recorded in the changelog.
  - **Status**: written in run 06 = official Step 11 (2026-10-27): `docs/api/domains/02-dashboard-shell/m03-overview.md#deprecated` (superseded by `merchant/stores`, no Django route, removal candidate; recorded in `docs/CHANGELOG.md`).

- [x] **DOC-056** — Document the command-palette search API
  - **Source**: INT-008 (M48) · Domain 2
  - **Output**: `docs/api/domains/02-dashboard-shell/m48-search.md`
  - **Must document**:
    - `GET /api/v1/search/?q&types&limit` → `{orders, products, customers, pages: [], actions: []}` (= `searchResultSchema`); `products/services/search_service.py`, `api/views_search.py`.
    - Arabic normalisation FR-48.05 on both sides (query in Python, columns via `lower(translate(…))`); no index, no migration; ≥ 2 chars; limit default 5, max 10.
    - Server-side trimming (M48 §10): orders need `orders.view`; customers need `customers.view` (phone groups from orders, name from the latest order — no tenant customer model); products for every active member; archived products sort last.
    - BFF `/api/bff/search` → `liveOrMock(…, "search", …)`; pages/actions from the palette's own index (`navigation.ts`); tests `api/test_search_api.py`.
  - **Done when**: permission-trimmed examples exist.
  - **Status**: written in run 07 = official Step 11 (2026-10-27): `docs/api/domains/02-dashboard-shell/m48-search.md` (route, params, response fields, matching rules per group, Arabic normalisation table, owner/staff/short-query examples, BFF row and hook, 7 tests).

- [x] **DOC-057** — Document the notification model and generation rules
  - **Source**: INT-009 (M49) · A.9 (`0216_notifications`)
  - **Output**: `docs/api/domains/02-dashboard-shell/m49-notifications.md#model`
  - **Must document**:
    - `Notification` (`dedupe_key`, audience `permission` / `merchant_only` / `audience_role` / `audience_staff`, `resolved_at`), `NotificationRead` per reader `owner` | `staff:<id>`.
    - Throttled (20 s / store) idempotent sync from M49 §5 sources; no legacy write path touched.
    - Every kind: `order_new` (status new, 72 h), `payment_review` (awaiting_payment | payment_review), `approval_pending` (approver role only), `behavior_alert` (unread warning/critical), `inbox_unread` (reopens on new messages), `low_stock`, `sync_failed` (marketplace + supplier jobs), `awb_failed`, `export_ready` (requester only), `billing_notice` (suspended / expiring ≤ 7 d), `provisioning_notice` (empty ready store).
    - Stateful kinds resolve when their source does (read for everyone, bell matches sidebar — FR-49.11) and reopen if it returns.
  - **Done when**: each kind lists its source, audience and resolve rule.
  - **Status**: written in run 07 = official Step 11 (2026-10-27): `docs/api/domains/02-dashboard-shell/m49-notifications.md#model` (both tables and migration `0216`, throttled idempotent sync, audiences, all 11 kinds with source, audience and resolve rule, state diagram).

- [x] **DOC-058** — Document notification routes
  - **Source**: INT-009 (M49)
  - **Output**: `docs/api/domains/02-dashboard-shell/m49-notifications.md#routes`
  - **Must document**:
    - `GET notifications/` (30-day panel window; `history=1` full page; unread system notices pinned), `GET notifications/summary/`, `POST notifications/read-all/`, `POST notifications/<id>/read/`; reads per reader.
    - Provider `products/services/notification_service.py`, `api/views_notifications.py`; BFF 4 rows `liveOrMock(…, "notifications", …)`; mock links fixed to real routes (`/dashboard/staff/alerts`, `/channels/marketplaces/jobs`, `/reports/exports`).
    - Tests `api/test_notifications_api.py`.
  - **Done when**: all 4 routes have examples.
  - **Status**: written in run 07 = official Step 11 (2026-10-27): `docs/api/domains/02-dashboard-shell/m49-notifications.md#routes` (summary, list, read, read-all with examples, errors, the 4 BFF rows; 7 tests).

- [x] **DOC-059** — Document the multi-store rollup endpoint
  - **Source**: INT-049 (M43) · Domain 2
  - **Output**: `docs/api/domains/02-dashboard-shell/m43-multi-store.md`
  - **Must document**:
    - `GET /api/v1/merchant/stores/?from&to` — `tenants/merchant_rollup.py`, `api/views_rollup.py`; feeds «متاجري» and the topbar switcher `useLinkedStores`.
    - Payload `{has_account, current_schema, from, to, stores: [{name, schema, domain, orders, completed, refunded, display_revenue_sar, last_snapshot_date, is_available}], totals: {orders, completed, refunded, display_revenue_sar}}`.
    - Gates: owner only — staff 403 «هذه الصفحة لمالك المتجر فقط.»; no owner session bound to this store 401.
    - Account rule: `MerchantAccount` linked to the current store (preferring the one whose `owner_phone` matches `merchant_phone`, raw or cleaned); not linked ⇒ `has_account:false` + zero totals (mock US-43.3); previous HTML page matched the phone only (leak risk fixed).
    - Range: ISO `from`/`to`; invalid ⇒ last 30 days ending today in store timezone; reversed ⇒ swapped; applied range echoed.
    - Per store: in-range sums from `TenantStatsSnapshot`; `last_snapshot_date` latest overall (not range-bound); `domain` = primary (any as fallback) or `#`; `is_available` = `is_active` AND `provisioning_status=ready` (numbers stay visible); sorted revenue desc then name; formatting server-side (FR-43.03).
    - Performance: fixed query count (one grouped sum + one grouped max), no live cross-schema query; no migration; HTML `merchant/master-dashboard/` untouched.
    - BFF `/api/bff/merchant/stores` → `liveOrMock(…, "rollup", "/api/v1/merchant/stores/")`; tests `api/test_rollup_api.py` (4).
  - **Done when**: linked, unlinked and staff responses are documented.
  - **Status**: written in run 07 = official Step 11 (2026-10-27): `docs/api/domains/02-dashboard-shell/m43-multi-store.md` (gates, range rules, linked/unlinked/staff responses, account rule, per-store rules, performance, BFF and hooks, 4 tests).

### 1.7 Domain 3 API — Core catalog & advanced products

Three independent switches over one product model: `products`, `b2b` (Domain 9), `advanced_products`.

- [x] **DOC-060** — Document the Products (Phase A) API overview and adapter
  - **Source**: INT-005 (M04) · A.9 (`0211`–`0215`) · project docs `claude/m04-products-step3-django.md`, `claude/m04-products-gap-analysis.md`
  - **Output**: `docs/api/domains/03-catalog/m04-products.md#overview`
  - **Must document**:
    - Provider `api/views_products.py`, `api/serializers_products.py`, product/variant/template services; migrations `products/0211`–`0215` (Steps 1–3, 2026-10-22).
    - Adapter: every Phase A BFF row mapped one-to-one via `PRODUCTS_LIVE_RULES` (key `products`); «تطبيق على منتجات» BFF-orchestrated (D7).
    - Write bodies bounded by 8 MB; Phase B (CSV, `extras/**`) is M37 → INT-045.
    - Tests `api/test_products_api.py`.
  - **Done when**: the full Phase A route list from the Step 3 doc is copied into the API doc.
  - **Status**: written in run 07 = official Step 17 (2026-10-27): `docs/api/domains/03-catalog/m04-products.md#overview` (provider files, gate chain, all 30 Phase A routes with BFF and Django paths, `PRODUCTS_LIVE_RULES` adapter, «تطبيق على منتجات» BFF-orchestrated (D7), 8 MB body bound, Phase B boundary, 30 tests, migrations 0211–0215).

- [x] **DOC-061** — Document product list and bulk actions
  - **Source**: INT-005 (M04)
  - **Output**: `docs/api/domains/03-catalog/m04-products.md#list`
  - **Must document**:
    - List filters/ordering/paging and bulk actions as served by the Phase A routes (from the M04 Step 3 doc); gates (`catalog.manage` for writes, reads per session); response fields per Zod.
  - **Done when**: list and every bulk action have examples.
  - **Status**: written in run 07 = official Step 17 (2026-10-27): `docs/api/domains/03-catalog/m04-products.md#list` (filters, ordering, paging, summary, response fields, and an example for each of the 7 bulk actions).

- [x] **DOC-062** — Document product create/update (editor)
  - **Source**: INT-005 (M04)
  - **Output**: `docs/api/domains/03-catalog/m04-products.md#editor`
  - **Must document**:
    - Create/update payload; mandatory fields (title, base price, category/template, unit) vs optional; Arabic field errors.
    - Live-QA rule: a saved product sends `stock` only when edited — echoing the loaded value reset backorders to 0 and was refused for variant/serial/location products (`product-editor.tsx` fix).
    - Image payloads base64 bounded by 8 MB.
  - **Done when**: create and partial update examples exist.
  - **Status**: written in run 07 = official Step 17 (2026-10-27): `docs/api/domains/03-catalog/m04-products.md#editor` (payload and field groups, mandatory vs optional, Arabic field errors, create and partial-update examples, quick add, delete-or-archive, change log, the "send `stock` only when edited" rule).

- [x] **DOC-063** — Document variants, attribute dictionary, templates and sectors
  - **Source**: INT-005 (M04)
  - **Output**: `docs/api/domains/03-catalog/m04-products.md#variants`
  - **Must document**:
    - Variant routes; mock aligned to Django: variant-sum stock mirror, variant SKUs `<sku>-<n>`; template/sector/dictionary reads; 409 responses when removing variants/attributes with dependencies (per M04 decisions).
  - **Done when**: variant generation and removal conflicts are documented.
  - **Status**: written in run 07 = official Step 17 (2026-10-27): `docs/api/domains/03-catalog/m04-products.md#variants` (generate and bulk variant routes, variant-sum stock mirror, SKUs `<sku>-<n>`, dictionary, templates, sectors and `apply-global`, every 409 with its Arabic message, BFF-only apply flow).

- [x] **DOC-064** — Document product images and stock routes
  - **Source**: INT-005 (M04)
  - **Output**: `docs/api/domains/03-catalog/m04-products.md#images-stock`
  - **Must document**:
    - Gallery image add/reorder/delete; stock update route and its interaction with variants/serials/locations (cross-reference INT-024 inventory adjustments).
    - Formula preview route (already live under `products` before INT-045).
  - **Done when**: both route groups have examples.
  - **Status**: written in run 07 = official Step 17 (2026-10-27): `docs/api/domains/03-catalog/m04-products.md#images-stock` (gallery add/reorder/delete, multipart vs base64 limits, stock route guard order, INT-024 cross-references, formula preview).

- [x] **DOC-065** — Document catalog categories (+ reorder)
  - **Source**: INT-006 (M05) · Domain 3
  - **Output**: `docs/api/domains/03-catalog/m05-organization.md#categories`
  - **Must document**:
    - Category CRUD + reorder (drag-and-drop `sort_order` applies globally: storefront menus and Django pages); writes gated by `catalog.manage`; `api/views_catalog.py`; BFF `liveOrMock(…, "catalog", …)`.
  - **Done when**: CRUD + reorder examples exist.
  - **Status**: written in run 07 = official Step 17 (2026-10-27): `docs/api/domains/03-catalog/m05-organization.md#categories` (category list/create/patch/delete with `reassign_to` and `children`, drag-and-drop reorder with cycle rejection and global `sort_order`, `catalog.manage` gate, BFF `liveOrMock(…,"catalog",…)` rows, migrations `0208`–`0210`; brands/tags/collections/badges are stubs for Step 17).

- [x] **DOC-066** — Document brands and tags (+ merge)
  - **Source**: INT-006 (M05)
  - **Output**: `docs/api/domains/03-catalog/m05-organization.md#brands-tags`
  - **Must document**:
    - Brand CRUD; tag CRUD + merge; gates; error messages.
  - **Done when**: merge semantics are documented.
  - **Status**: written in run 08 = official Step 17 (2026-10-27): `docs/api/domains/03-catalog/m05-organization.md#brands-tags` (brand and tag contracts and slug rules, all 9 routes with Arabic errors, delete semantics, full tag-merge semantics with before/after and flow diagram, `last_used_at` maintenance, tests).

- [x] **DOC-067** — Document collections and badges
  - **Source**: INT-006 (M05)
  - **Output**: `docs/api/domains/03-catalog/m05-organization.md#collections-badges`
  - **Must document**:
    - Collection CRUD + products add / reorder / remove; badge CRUD (badges appear on storefront cards `badges[{name,color}]`, INT-011).
    - All 15 BFF routes listed one-to-one; status «Already Integrated» (live-tested 2026-10-22); tests `api/test_catalog_api.py`, `api/test_catalog_serializers.py`.
  - **Done when**: the 15-row table is complete.
  - **Status**: written in run 08 = official Step 17 (2026-10-27): `docs/api/domains/03-catalog/m05-organization.md#collections-badges` (collection CRUD plus add / reorder / remove with the `product_order` rules, badge CRUD, where badges appear on storefront cards vs the dashboard, the complete 15-row BFF table, tests).

- [x] **DOC-068** — Document bundle components
  - **Source**: INT-045 (M37) · Domain 3
  - **Output**: `docs/api/domains/03-catalog/m37-advanced-products.md#bundles`
  - **Must document**:
    - `products/<id>/bundle-components/` GET/POST, `<cid>/` PATCH/DELETE; reads `inventory.view`, writes `catalog.manage`; every write answers the resource's new state and logs the change-log field under the actor.
    - `display_bundle_total` = mandatory components converted to the bundle's currency + build fee.
    - Provider `products/services/product_extras_service.py`, `api/views_product_extras.py`; models `BundleComponent`.
  - **Done when**: total computation is documented with an example.
  - **Status**: written in run 08 = official Step 17 (2026-10-27): `docs/api/domains/03-catalog/m37-advanced-products.md#bundles` (M37 overview, gate chain and 18-row route table, bundle GET/POST/PATCH/DELETE with examples and Arabic errors, step-by-step `display_bundle_total` with a test-based and a constructed worked example, change-log rules, BFF/mock behaviour, tests).

- [x] **DOC-069** — Document compatibility rules
  - **Source**: INT-045 (M37)
  - **Output**: `docs/api/domains/03-catalog/m37-advanced-products.md#compatibility`
  - **Must document**:
    - `products/<id>/compatibility-rules/` + `<rid>/`; operators `equals` · `not_equals` · `in`; a 2nd attribute OR a value; model `CompatibilityRule`.
  - **Done when**: each operator has an example.
  - **Status**: written in official Step 18 (2026-10-27): `docs/api/domains/03-catalog/m37-advanced-products.md#compatibility` (rule shape, the three operators with one worked example each, request and response, every Arabic error, DELETE, change-log side effects, tests; two ⚠️ call-outs: the model docstring promises server enforcement that was not found, and live bundle components carry `choice: null` where the mock fills choices).

- [x] **DOC-070** — Document personalization fields
  - **Source**: INT-045 (M37)
  - **Output**: `docs/api/domains/03-catalog/m37-advanced-products.md#personalization`
  - **Must document**:
    - `products/<id>/personalization-fields/`, `reorder/`, `<fid>/`; 9 types; select/multi_select need options; delete renumbers; model `PersonalizationField`.
    - Gap closed: cart adds filled personalization surcharges per unit (`tier_pricing.personalization_extra`); checkout copies values to new `OrderItem.personalization` (migration `0236_advanced_products_api`).
    - Not wired: merchant order detail does not show a line's personalization (no M06 field).
  - **Done when**: field types and the surcharge rule are documented.
  - **Status**: written in official Step 18 (2026-10-27): `docs/api/domains/03-catalog/m37-advanced-products.md#personalization` (field shape, the nine types, create / patch / reorder / delete with the renumbering rule, every Arabic error, the surcharge rule from cart to `OrderItem.personalization` with a worked example and migration `0236_advanced_products_api`, what the server does not enforce, the merchant order detail not wired; one ⚠️ call-out for the stale cart-service docstring).

- [x] **DOC-071** — Document merchant auction and bids
  - **Source**: INT-045 (M37)
  - **Output**: `docs/api/domains/03-catalog/m37-advanced-products.md#auction`
  - **Must document**:
    - `products/<id>/auction/` GET (draft row created on first read; an active auction past `end_at` closed on read) / PUT (all mock rules; stock forced to 1 by `Product.save`); `auction/bids/` newest first; models `Auction`, `AuctionBid`; auction row locked on writes.
  - **Done when**: auction lifecycle states are documented.
  - **Status**: written in official Step 18 (2026-10-27): `docs/api/domains/03-catalog/m37-advanced-products.md#auction` (lifecycle diagram and states, draft row created on first read and an active auction closed on read, full-replace `PUT` with all rules and Arabic errors and the four-key `400` example, stock forced to 1, change log, bids newest first; ⚠️ call-outs: the row is locked by bids only, not by the merchant `PUT`; the code adds a 100,000,000 limit the mock lacks).

- [x] **DOC-072** — Document serial numbers
  - **Source**: INT-045 (M37)
  - **Output**: `docs/api/domains/03-catalog/m37-advanced-products.md#serials`
  - **Must document**:
    - `products/<id>/serials/` GET/POST `{codes}`; duplicates inside the paste and against existing codes → 400 `{codes, duplicates}`; stock = available units with a stock movement; model `InventoryItem`.
  - **Done when**: duplicate handling has an example.
  - **Status**: written in official Step 18 (2026-10-27): `docs/api/domains/03-catalog/m37-advanced-products.md#serials` (counters and code list, paste rules, duplicates inside the paste and against existing codes with the `400 {codes, duplicates}` example, all-or-nothing and race handling, stock = available count with a `manual_adjust` movement, change log; ⚠️ call-out for the mock's missing stock update and 255 limit).

- [x] **DOC-073** — Document CSV product import (3 routes)
  - **Source**: INT-045 (M37/Products Phase B) · A.8 (no Celery) · A.9 (`ProductImportJob`)
  - **Output**: `docs/api/domains/03-catalog/m37-advanced-products.md#import`
  - **Must document**:
    - `POST products/import/` multipart → 201 `{job_id, columns, preview (20), total_rows, suggested_mapping, row_errors}`; read with the dropshipping `FeedReader`: csv/tsv/txt/xlsx, UTF-8 or Windows-1256, delimiter sniffed, ≤ 20,000 rows.
    - `POST import/<job>/run/` `{mapping}` — name + price required; 409 once run.
    - `GET import/<job>/` — processed in 200-row chunks under the job's row lock on run and every poll (real progress, no Celery, short requests); imported products are drafts; category by exact name only.
    - Provider `products/services/product_import_service.py`; BFF via `ADVANCED_LIVE_RULES`.
  - **Done when**: upload → map → run → poll is documented end to end.
  - **Status**: written in official Step 18 (2026-10-27): `docs/api/domains/03-catalog/m37-advanced-products.md#import` (upload → map → run → poll end to end with a sequence diagram, file and reader limits, suggested-mapping table, row-validation order, response objects and a worked example, every Arabic error, 200-row batches under the row lock, drafts and category-by-name; ⚠️ call-outs for the never-set `failed` status and the mock differences; observations for the register).

- [x] **DOC-074** — Document CSV product export
  - **Source**: INT-045
  - **Output**: `docs/api/domains/03-catalog/m37-advanced-products.md#export`
  - **Must document**:
    - `GET products/export/` (BFF `export.csv`) — the list's filters + ordering, mock columns, BOM.
  - **Done when**: column list is published.
  - **Status**: written in official Step 18 (2026-10-27): `docs/api/domains/03-catalog/m37-advanced-products.md#export` (route, headers and BOM, the list's filters and ordering with no paging, the nine columns with formats, an example row from the test; ⚠️ call-out for the line ending; formula-injection observation).

- [x] **DOC-075** — Document storefront auction and bidding
  - **Source**: INT-045 · Domain 3/5
  - **Output**: `docs/api/domains/03-catalog/m37-advanced-products.md#storefront-auction`
  - **Must document**:
    - `GET catalog/products/<id>/auction/?currency` (never `reserve`; `reserve_met` only once ended); bid at both `…/auction/bids/` and `…/bids/` `{bidder_name, bidder_phone, amount, currency}` → 200 the auction / 400 per field / 409 `{detail, auction}` (draft · ended · below the next bid).
    - Compared in buyer currency with the product's own rate; row locked; anti-sniping extension; buy-now ends it; no OTP (name + phone only).
    - Provider `products/services/storefront_auction_service.py`; Django-first (no switch); tests `api/test_product_extras_api.py` (10).
  - **Done when**: bid outcomes have examples.
  - **Status**: written in official Step 18 (2026-10-27): `docs/api/domains/03-catalog/m37-advanced-products.md#storefront-auction` (gates and the 300/min IP cap, public view fields with the `reserve_met` rule, bid rules as a decision flow, eight bid outcomes with examples, field errors, anti-sniping and buy-now, mock parity; ⚠️ call-out: the module docstring says the end moves by the same duration, the code sets it to now + window).

- [x] **DOC-076** — Document M37 frontend contract notes and open items
  - **Source**: INT-045 · A.13
  - **Output**: `docs/api/domains/03-catalog/m37-advanced-products.md#notes`
  - **Must document**:
    - `ADVANCED_LIVE_RULES` independent of `products`/`b2b`; `.env.example` lists `advanced_products`; `scripts/bundles-check.ts` uses `caret: "initial"` (Playwright inline `caret-color` hydration warning).
    - Not wired: `bundle_selection` in cart actions (PDP does not send it); personalization not visible in merchant order detail.
  - **Done when**: open items are mirrored in the open-items register.
  - **Status**: written in official Step 18 (2026-10-27): `docs/api/domains/03-catalog/m37-advanced-products.md#notes` (live-switch independence, `.env.example`, the `caret: "initial"` reason, the two not-wired items, and a 17-row register-ready open-items table with the wording documentation may use). **Register mirror deferred**: `docs/architecture/90-open-items.md` is written in DOC-526 (official Step 50) and does not exist yet, so the "mirrored in the open-items register" half of *Done when* is completed there; the page holds the table ready to copy.

### 1.8 Domain 4 API — Order management & returns

- [x] **DOC-077** — Document the orders API architecture note
  - **Source**: INT-007 (M06) · Domain 4
  - **Output**: `docs/api/domains/04-orders-returns/m06-orders.md#overview`
  - **Must document**:
    - `products/services/order_api_service.py` reuses `Order.set_fulfillment_status` / `cancel_order` / `release_reserved_stock`, `process_order_refund`, `process_order_merchant_credit`, marketplace `order_guard`, `create_b2b_draft_order`, `convert_order_to_pickup`; transitions copied from `update_order_status` / `confirm_payment_received` / `adjudicate_*`; legacy screens untouched; `api/serializers_orders.py`, `api/views_orders.py`; no migration.
    - BFF: all 11 rows `liveOrMock(…, "orders", …)`; print reuses detail; tests `api/test_orders_api.py`.
  - **Done when**: the 11-route table is published.
  - **Status**: written in official Step 19 (2026-10-27): `docs/api/domains/04-orders-returns/m06-orders.md#overview` (what is reused and what is copied from the legacy functions, no migration, the three design rules, the 11-route table with the BFF paths and gates, the gate chain, the print view and the tests). The BFF file `orders/[id]/payment/[action]/route.ts` is nested too deeply to be staged, so its row is documented from `ordersApi`, `urls.py` and `22-live-module-keys.md`.

- [x] **DOC-078** — Document order list, counters and form options
  - **Source**: INT-007 (M06)
  - **Output**: `docs/api/domains/04-orders-returns/m06-orders.md#list`
  - **Must document**:
    - `GET orders/` (filters, paging), `GET orders/counters/`, `GET orders/form-options/` (manual order form); gate `orders.view`.
  - **Done when**: filters and counters are documented.
  - **Status**: written in official Step 19 (2026-10-27): `docs/api/domains/04-orders-returns/m06-orders.md#list` (all 11 filters of `GET orders/` with their ignore/no-row rules, ordering, paging with relative `next`/`previous`, the counters with the closed-status rule, the form-options mapping with the YER_NEW conversion; JSON from `api/test_orders_api.py`).

- [x] **DOC-079** — Document order detail, PATCH and timeline
  - **Source**: INT-007 (M06)
  - **Output**: `docs/api/domains/04-orders-returns/m06-orders.md#detail`
  - **Must document**:
    - `GET` / `PATCH orders/<id>/`; optimistic lock on every write (`select_for_update` + `version` → 409 `{detail, current_version, order}`); gift message max 300 (model).
    - Timeline from created + `AuditLog(order.*)` + `ShipmentEvent` + `OrderRefund` (no new model).
    - Print view reuses the detail row.
  - **Done when**: a 409 retry example exists.
  - **Status**: written in official Step 19 (2026-10-27): `docs/api/domains/04-orders-returns/m06-orders.md#detail` (every detail field, `PATCH` with its four errors, the `select_for_update` + `version` wrapper, a stale-version 409 → retry 200 example from the tests, the four-source timeline with its derived ids, print view = detail row).

- [x] **DOC-080** — Document fulfilment-status and status transitions
  - **Source**: INT-007 (M06)
  - **Output**: `docs/api/domains/04-orders-returns/m06-orders.md#transitions`
  - **Must document**:
    - `POST orders/<id>/fulfillment-status/`, `POST orders/<id>/status/`; gate `orders.update_status`.
    - Server-side difference: a `releases_stock` fulfilment status restocks without forcing `cancelled`.
    - Webhooks `order.status_changed` / `order.fulfillment_changed` (INT-023) and push (INT-016) side effects.
  - **Done when**: the transition table is published.
  - **Status**: written in official Step 19 (2026-10-27): `docs/api/domains/04-orders-returns/m06-orders.md#transitions` (fulfilment-status checks and flag effects, the `FINANCIAL_TRANSITIONS` table with a Mermaid diagram, the emoji labels, effects per target, the webhook/push matrix and push texts). Discrepancies: the webhook coverage of `POST status`, the missing merchant credit on `→ completed`, and the mock differences.

- [x] **DOC-081** — Document payment confirm/approve/reject
  - **Source**: INT-007 (M06)
  - **Output**: `docs/api/domains/04-orders-returns/m06-orders.md#payment`
  - **Must document**:
    - `POST orders/<id>/payment/<confirm|approve|reject>/`; rejecting a `payment_review` cancels + restocks (legacy adjudication); merchant credit on confirmation.
  - **Done when**: each action's effect on order/stock/wallet is documented.
  - **Status**: written in official Step 19 (2026-10-27): `docs/api/domains/04-orders-returns/m06-orders.md#payment` (the action × effect table for order, stock, wallet, timeline and notification; the exact merchant-credit rule). Discrepancy: "merchant credit on confirmation" is conditional (sharwa_pay paid, or official-courier cash once completed).

- [x] **DOC-082** — Document order refunds
  - **Source**: INT-007 (M06) · INT-026
  - **Output**: `docs/api/domains/04-orders-returns/m06-orders.md#refunds`
  - **Must document**:
    - `POST orders/<id>/refunds/` via `process_order_refund` (cap, `refunded` status, merchant-wallet reversal, loyalty claw-back, webhook `order.refunded`); gate `orders.refund`.
    - The read-only list `orders/refunds/` belongs to M24 (INT-026).
  - **Done when**: refund methods and side effects are listed.
  - **Status**: written in official Step 19 (2026-10-27): `docs/api/domains/04-orders-returns/m06-orders.md#refunds` (body rules, the `process_order_refund` rules, the four methods and their caps, full-refund status, merchant-wallet reversal, loyalty claw-back, `order.refunded`; pointer to the M24 log).

- [x] **DOC-083** — Document custom order statuses CRUD
  - **Source**: INT-007 (M06)
  - **Output**: `docs/api/domains/04-orders-returns/m06-orders.md#order-statuses`
  - **Must document**:
    - `order-statuses/` GET/POST, `order-statuses/<id>/`, `order-statuses/reorder/`; `releases_stock` flag semantics.
  - **Done when**: CRUD + reorder examples exist.
  - **Status**: written in official Step 19 (2026-10-27): `docs/api/domains/04-orders-returns/m06-orders.md#order-statuses` (the five seeded statuses, row shape, create/patch/delete/reorder examples from the tests, every validation message, `releases_stock` / `marks_completed` semantics). Discrepancy: the Django seed never sets `marks_completed`, the frontend seed does.

- [x] **DOC-084** — Document manual orders, B2B drafts and out-of-scope order rows
  - **Source**: INT-007 · INT-044 · INT-021 · INT-014/015
  - **Output**: `docs/api/domains/04-orders-returns/m06-orders.md#related`
  - **Must document**:
    - Manual order via `orders/` POST with `form-options`; B2B drafts need a staff session (`ApprovalRequest.requested_by`) — reference Domain 9.
    - Out of scope rows and their homes: `orders/refunds/` (INT-026), `orders/<id>/convert-to-pickup/` (INT-021), storefront `orders/public|track` (INT-014/INT-015).
  - **Done when**: cross-links are in place.
  - **Status**: written in official Step 19 (2026-10-27): `docs/api/domains/04-orders-returns/m06-orders.md#related` (manual phone order and B2B draft: body, errors, what is created, the staff-session rule; the out-of-scope route table with homes). Discrepancy: `create_order` sends no `order.created` webhook/push.

- [x] **DOC-085** — Document the returns API rewrite, gates and options
  - **Source**: INT-026 (M24) · Domain 4
  - **Output**: `docs/api/domains/04-orders-returns/m24-returns.md#overview`
  - **Must document**:
    - Before: «Ready» passthrough rows whose shapes failed Zod (`ReturnRequestSerializer` lacked `customer_name` / `lines_count` / `display_amount` / `location` / `timeline` / `decision_note`; decimal strings for `quantity`/`remaining`; RMA `{rma_id, status}` with QA `approve|reject`; no RMA permission).
    - Rewritten behind the same URLs and class names (re-exported from `api/views.py` for `api/tests.py` / `products/test_returns_b2b_api.py`): `products/services/returns_api_service.py` + `api/views_returns.py`.
    - Gates: plan feature `refunds` + `orders.process_returns`; scan/QA also `inventory.adjust`; refund log `orders.refund`.
    - `GET returns/options/` (active locations; `refunds` gate only, works without `multi_location`).
    - BFF 4 rows `liveOrMock(…, "returns", …)`; decision toasts treat any non-`rejected` result as approved.
  - **Done when**: gates and options are documented.
  - **Status**: written in official Step 19 (2026-10-27): `docs/api/domains/04-orders-returns/m24-returns.md#overview` (the two flows, what INT-026 rewrote, the 11-route table with the 4 live BFF rows, the gate chain, `returns/options/`, the decision-toast rule, all enums). The pre-rewrite shapes are quoted from the roadmap; the old serializer is not in the files read.

- [x] **DOC-086** — Document return requests: create, list, decisions
  - **Source**: INT-026 (M24)
  - **Output**: `docs/api/domains/04-orders-returns/m24-returns.md#returns`
  - **Must document**:
    - Per-line errors `{line_items:[{quantity_returned:[…]}]}` aligned to the request; remaining ignores rejected returns; reject needs a note (stored as `decision_note`); decided or stale return → 409 `{detail, current_version}`.
    - Approve restocks every `restock` line to the chosen `location_id` (else its fulfilment's location) via `return_service.restock_to_location` (location row; product/variant stock directly when multi-location is off) + `refund_restock` movement referenced `إرجاع #id` in the M21 ledger.
    - `wallet` / `store_credit` credit the customer wallet via `process_order_refund('wallet_credit')`; any money failure rolls the whole approval back; status `completed` in one step.
    - Cash without drawer liquidity → 400 `CashLiquidityError: …` (409 stays for conflicts).
  - **Done when**: approve/reject examples with each refund method exist.
  - **Status**: written in official Step 19 (2026-10-27): `docs/api/domains/04-orders-returns/m24-returns.md#returns` (items, create with per-line aligned errors, list with DRF links, detail, approve/reject with the check order, 409 examples, and approve examples for `wallet` and `cash` from the tests; `store_credit` and `original_payment` are derived from `MONEY_BY_METHOD`, not test-covered). Discrepancy: the `refund_restock` reference is `('return', id)`, «إرجاع #id» is the note.

- [x] **DOC-087** — Document RMA routes (list, detail, scan, QA)
  - **Source**: INT-026 (M24)
  - **Output**: `docs/api/domains/04-orders-returns/m24-returns.md#rma`
  - **Must document**:
    - `GET returns/rma/?status&q&page&page_size` + `counts` per status; `GET returns/rma/<pk>/`.
    - Create with field errors; events `requested → in_transit_back`; scan accepts `RMA-12`; locked destination (400); re-scan 409; quarantine; QA `restocked` moves quarantine → on-hand (+ product stock when off multi-location) with a `RMA-<id>` ledger movement = `restock_movement_id`.
  - **Done when**: the RMA state machine is published.
  - **Status**: written in official Step 19 (2026-10-27): `docs/api/domains/04-orders-returns/m24-returns.md#rma` (the Mermaid state machine, the RMA row, list with `counts`, create/scan/QA tables with every message, quarantine and restock effects, `restock_movement_id`).

- [x] **DOC-088** — Document the refunds log and returns storage
  - **Source**: INT-026 (M24)
  - **Output**: `docs/api/domains/04-orders-returns/m24-returns.md#refunds-log`
  - **Must document**:
    - `GET orders/refunds/` read-only `OrderRefund` log, actor from the M06 order audit; gate `orders.refund`.
    - Return timelines and RMA events in append-only `AuditLog` (no new tables, no migration; pre-INT-026 rows derive from timestamps); every create/decision also lands on the order timeline.
    - Legacy tests updated (feature patch; cash = 400; paid order for the wallet credit); tests `api/test_returns_api.py` (8).
  - **Done when**: log fields and storage notes are documented.
  - **Status**: written in official Step 19 (2026-10-27): `docs/api/domains/04-orders-returns/m24-returns.md#refunds-log` and `#storage` (log filters and fields, the audit-row table, legacy-row derivation, the order-timeline events, the 8 tests). The roadmap's claim that the legacy tests were updated (cash = 400, paid order) could not be re-verified: `products/test_returns_b2b_api.py` was not available; `api/tests.py` carries the `refunds` feature patch. Discrepancy: RMA events do not reach the order timeline.

### 1.9 Domain 5 API — Storefront, purchase journey & PWA (واجهة المتجر ورحلة الشراء وتطبيق PWA)

The whole buyer journey is Django-first (`getPublicJson`, `getProduct()`, `getTracking()`, `storefrontAdapter`, the `/api/v1/*` passthrough): the fixture only answers on 404/405/501 or when Django is down, so Django answers win as soon as they exist and no live switch is needed. The anonymous storefront session carries the cart, coupons, OTP keys, `wishlist_phone`, holds and buy-now carts. Manifest, `/icon` and `/sw.js` stay Next-owned from `/config/`. Related storefront rows documented in other domains: wallet/loyalty (Domain 6, INT-028), referral (Domain 7, INT-034), booking slots (Domain 13, INT-036), auction (Domain 3, INT-045), tier prices in the cart (Domain 9, INT-044).

- [x] **DOC-089** — Write the Domain 5 API overview page (storefront integration model)
  - **Source**: INT-011 → INT-016, INT-029 (M09, M10, M11, M12, M41, M44, M42) · inventory Domain 5 + A.2 + A.4
  - **Output**: `docs/api/domains/05-storefront/README.md`
  - **Must document**:
    - The overview table of Domain 5: INT-011 M09 (`products/services/storefront_catalog_service.py`, `api/views_storefront.py`; `config/`, sections, `catalog/categories/`, `catalog/products/`, `catalog/facets/`, `catalog/offers/`); INT-012 M10 (`products/services/storefront_product_service.py` via `ProductDetailSerializer`; product detail, `…/reviews/`, `…/quote/`); INT-013 M11 (`products/services/storefront_cart_service.py`; `cart/`, `cart/actions/`, `cart/coupon/`, `cart/contact/`, `cart/restore/`); INT-014 M12 (`products/services/storefront_checkout_service.py`, `api/views_checkout.py`; `checkout/*`, `orders/public/<uuid>/`, `orders/<uuid>/receipt/`); INT-015 M41 (`products/services/order_tracking_service.py`, `api/views_tracking.py`; `orders/track/<public_uuid>/`); INT-016 M44 (`api/views.py` PWA rows, `products/services/order_push_service.py`, `api/views_push.py`; `pwa/install-event/`, `push/*`, `push/stats/`, `push/test/`); INT-029 M42 (`products/services/engagement_service.py`, `api/views_engagement.py`; `shopper/phone/`, `wishlist/*`, back-in-stock, `store-reviews/`, `customers/otp/send/`, product review POST).
    - Live switch per task: none (Django-first) for INT-011 → INT-015 and INT-029; `pwa` only for the new merchant rows `push/stats` + `push/test` (INT-016); cart via the `/api/v1/cart*` transparent passthrough + Django-first BFF rows.
    - Django-first fallback rule: fixture only on 404/405/501 or Django down; adapters involved — `getPublicJson`, `getProduct()`, `getTracking()`, `storefrontAdapter`, `/api/v1/*` passthrough (rows marked «Ready» in `ready-api-v1.md`).
    - Storefront visitor identity (A.4): anonymous Django session on the store host carrying cart, `applied_coupon_id`, OTP keys, `wishlist_phone`, booking holds (`cart_bookings` / `buy_now_bookings`), the isolated `buy_now_cart`.
    - Next-owned assets: manifest, `/icon`, `/sw.js` built from `/config/` (R-16).
    - Money: all amounts are server-formatted `display_*` strings (`format_money`); conversion via `_convert_value_to_target` in `?currency=` (A.6).
    - Cross-domain storefront rows and where they are documented (Domain 3 auction, Domain 6 wallet/loyalty, Domain 7 referral, Domain 9 tier prices, Domain 13 booking slots).
    - Test suites for the domain: `api/test_storefront_catalog_api.py`, `test_storefront_product_api.py`, `test_storefront_cart_api.py`, `test_storefront_checkout_api.py`, `test_order_tracking_api.py`, `test_pwa_push_api.py` (+ legacy `products/test_push_notifications.py`, `test_pwa_install_tracking.py` unchanged), `test_engagement_api.py`.
  - **Done when**: a developer can find every Domain 5 route, its provider file, its adapter and its fallback rule from this page.
  - **Status**: written in official Step 12 (2026-10-27): `docs/api/domains/05-storefront/README.md` (domain table of the seven modules with provider files and routes, Django-first fallback rule and the four adapters, visitor identity, Next-owned assets, money, cross-domain rows, test suites; the M41/M42/M44 rows are taken from the roadmap and verified in steps 13–14).

#### INT-011 — M09 Storefront Home & Catalog Listing

- [x] **DOC-090** — Document `GET /api/v1/config/` and storefront sections as consumed by the storefront home
  - **Source**: INT-011 (M09), INT-010 (M34 extensions), INT-002 hand-over · inventory Domain 5, Domain 12
  - **Output**: `docs/api/domains/05-storefront/m09-storefront-home-catalog.md#config-and-sections`
  - **Must document**:
    - `/config/` + sections already matched the contract before INT-011 (section types identical); the M34 extensions landed in INT-010 (card border, announcement colours/speed/page flags, free-shipping threshold, currency, SEO + absolute OG image, contact links, about/return policy, timezone, week start), gifting/loyalty via INT-019, `tracking` (public ids only, null when off or out of plan) via INT-023.
    - `StoreSection.label` returned by `/config/` (custom name from the M08 editor), else the type name (INT-018).
    - Read path: `getPublicJson` server fetcher → fixture only on 404/405/501 or Django down; `storefrontAdapter` for BFF rows.
    - `[NEEDS BACKEND]` notes updated in the frontend.
  - **Done when**: the `/config/` response and section payload are documented field by field with their source task.
  - **Status**: written in official Step 12 (2026-10-27): `docs/api/domains/05-storefront/m09-storefront-home-catalog.md#config-and-sections` (`/config/` as the home consumes it: 39 serializer fields + `tracking`, section rules, free-shipping unit call-out, gifting/loyalty flag call-out).

- [x] **DOC-091** — Document `GET /api/v1/catalog/categories/`
  - **Source**: INT-011 (M09) · inventory Domain 5
  - **Output**: `docs/api/domains/05-storefront/m09-storefront-home-catalog.md#categories`
  - **Must document**:
    - Gap closed: each category now carries `image` as an absolute URL.
    - Ordering follows the merchant's global drag-and-drop `sort_order` (Domain 3 catalog organization).
    - Django-first fallback behaviour.
  - **Done when**: response schema with `image` and an example are published.
  - **Status**: written in official Step 12 (2026-10-27): `docs/api/domains/05-storefront/m09-storefront-home-catalog.md#categories` (tree, `image`, ordering, no visibility filter).

- [x] **DOC-092** — Document `GET /api/v1/catalog/products/` (listing, search, filters, ordering)
  - **Source**: INT-011 (M09), INT-012 fix · inventory Domain 5 + A.11
  - **Output**: `docs/api/domains/05-storefront/m09-storefront-home-catalog.md#products`
  - **Must document**:
    - Card fields added: `image_url`, `badges[{name,color}]`, `slug`; card `display_price` / `display_old_price` produced by `format_money` (INT-012 fix — legacy `get_formatted_price` dropped the «ر.ي» symbol for YER).
    - Filter `category`: a parent category includes its sub-categories.
    - `search`: matches `name` / `name_en` with the shared Arabic normalization (`src/lib/i18n/normalize.ts` ↔ Python, PostgreSQL `lower(translate(…))`) plus `description` as before.
    - `ordering` values: `-created_at` · `price` · `-price` · `name`.
    - Brand/tag/collection filters as used by facets; `?currency=` conversion.
  - **Done when**: every query param and card field is listed with examples.
  - **Status**: written in official Step 12 (2026-10-27): `docs/api/domains/05-storefront/m09-storefront-home-catalog.md#products` (query parameters, search normalisation, card fields, pagination (page size 20, max 50), 404 past the last page, zero-result search log).

- [x] **DOC-093** — Document `GET /api/v1/catalog/facets/`
  - **Source**: INT-011 (M09) · inventory Domain 5
  - **Output**: `docs/api/domains/05-storefront/m09-storefront-home-catalog.md#facets`
  - **Must document**:
    - New row: brand / tag / collection counts computed on the same visible product set as the listing.
    - Each facet dimension ignores its own filter (standard disjunctive faceting).
    - Provider `products/services/storefront_catalog_service.py`, `api/views_storefront.py`.
  - **Done when**: facet response shape and counting rule are documented.
  - **Status**: written in official Step 12 (2026-10-27): `docs/api/domains/05-storefront/m09-storefront-home-catalog.md#facets` (disjunctive counting with `filter_visible(omit=…)`, fallback behaviour).

- [x] **DOC-094** — Document `GET /api/v1/catalog/offers/`
  - **Source**: INT-011 (M09) · inventory Domain 5
  - **Output**: `docs/api/domains/05-storefront/m09-storefront-home-catalog.md#offers`
  - **Must document**:
    - Active offers inside their validity window only, ordered `-priority`, max 6.
    - Link mapping to storefront routes: `/p/<id>` (product) · `/c/<id>` (category) · `/products` (all).
    - Tests: `api/test_storefront_catalog_api.py`.
  - **Done when**: response shape, ordering, cap and link mapping are documented.
  - **Status**: written in official Step 12 (2026-10-27): `docs/api/domains/05-storefront/m09-storefront-home-catalog.md#offers` (max 6, `-priority,id`, link mapping `/p/<id>`, `/c/<id>`, `/products`).

#### INT-012 — M10 Product Detail Page

- [x] **DOC-095** — Document the storefront product detail payload (`GET /api/v1/catalog/products/<id>/`)
  - **Source**: INT-012 (M10) · inventory Domain 5 + A.6
  - **Output**: `docs/api/domains/05-storefront/m10-product-detail.md#detail`
  - **Must document**:
    - Before: Django's row #4 only served the card + description/sizes/colours/deposit.
    - Provider `products/services/storefront_product_service.py` merged by `ProductDetailSerializer.to_representation`.
    - Every block: images, video, unit + quantity limits (min/max decimals), backorder, template/type, variant display style, used attributes/options (swatch colour + image), variants with effective prices, tier prices (charged since INT-044), formula, bundle (components, compatibility rules, total of mandatory parts + build fee, first unavailable mandatory component), personalization fields, refundable deposit, `is_bookable` (false while the `bookings` feature is off — FR-26.01, INT-036) and auction flags, category path (root → leaf), brand, related / upsell / cross-sell (merchant `RelatedProduct` links first, else the mock's automatic rules), reviews summary, SEO, JSON-LD `structured`.
    - All money converted via `_convert_value_to_target` in `?currency=`.
    - Server fetcher `getProduct()` (Django-first).
  - **Done when**: the full PDP schema is documented block by block with the currency rule.
  - **Status**: written in official Step 12 (2026-10-27): `docs/api/domains/05-storefront/m10-product-detail.md#detail` (detail payload, 35 extension keys, variants, formula, bundle, personalization, related products (limits 8/4/4), min/max truncation observation).

- [x] **DOC-096** — Document `GET /api/v1/catalog/products/<id>/reviews/`
  - **Source**: INT-012 (M10), INT-029 (M42) · inventory Domain 5
  - **Output**: `docs/api/domains/05-storefront/m10-product-detail.md#reviews`
  - **Must document**:
    - 5 reviews per page, `?rating` filter, summary block.
    - Only approved reviews counted/listed (`ProductReview.is_approved`, INT-029); legacy reviews default approved.
    - The POST on the same URL is documented under INT-029.
  - **Done when**: pagination, filter and summary fields are documented.
  - **Status**: written in official Step 12 (2026-10-27): `docs/api/domains/05-storefront/m10-product-detail.md#reviews` (5 per page, `?rating` filter, `next` as query string, summary over all approved reviews).

- [x] **DOC-097** — Document `GET /api/v1/catalog/products/<id>/quote/?value=`
  - **Source**: INT-012 (M10) · inventory Domain 5
  - **Output**: `docs/api/domains/05-storefront/m10-product-detail.md#formula-quote`
  - **Must document**:
    - Formula unit price × `value` = exactly what the cart charges.
    - Currency conversion via `?currency=`.
    - History: rows left on the fixture at the time (review POST + back-in-stock → INT-029; auction + bids → INT-045; slots + hold → INT-036) — Django answered 404/405 meanwhile so the storefront kept working; all done since.
    - Tests: `api/test_storefront_product_api.py`.
  - **Done when**: request/response and the "same price as the cart" guarantee are documented.
  - **Status**: written in official Step 12 (2026-10-27): `docs/api/domains/05-storefront/m10-product-detail.md#formula-quote` (quote request/response, errors, worked example 437.50, cart-vs-quote rounding call-out).

#### INT-013 — M11 Cart

- [x] **DOC-098** — Document `GET /api/v1/cart/`
  - **Source**: INT-013 (M11), INT-036, INT-045, INT-044 · inventory Domain 5
  - **Output**: `docs/api/domains/05-storefront/m11-cart.md#get-cart`
  - **Must document**:
    - Transport: transparent `/api/v1/cart*` passthrough (Ready rows #5–#7); writes reach Django with a body only since the `upstream.ts` buffering fix (A.11).
    - Provider `products/services/storefront_cart_service.py` over the same `products/cart.py` session cart + `pricing.build_order_invoice` used by checkout.
    - Item extensions: image, variant, slug, max/stock, auction, booking start, availability; hidden products listed but unpriced.
    - Cart-level fields: `coupon_code`, `display_discount`, `applied_offers`, `display_total`, free-shipping flag / remaining / progress.
    - Unit fix: the free-shipping threshold is compared by Django in the dashboard currency (`build_order_invoice`); settings labels (M34 + M15) and the cart mock now say so instead of YER_NEW (noor fixture 30000 → 300).
    - Unit price precedence from `tier_pricing.unit_price` (variant ?? formula ?? highest tier ≤ quantity ?? base, INT-044) and personalization surcharge per unit (`tier_pricing.personalization_extra`, INT-045).
    - Bookings: `cart_count` / `product_qty` count bookings like `GET cart/`; expired holds drop out of the cart (FR-26.07, INT-036).
  - **Done when**: every field of the cart response is documented with its pricing source.
  - **Status**: written in official Step 12 (2026-10-27): `docs/api/domains/05-storefront/m11-cart.md#get-cart` (cart and line fields, pricing precedence (variant, formula, tiers, personalization), free-shipping progress, hidden products, bookings, `DELETE`, automatic-offer discount observation).

- [x] **DOC-099** — Document `POST /api/v1/cart/actions/`
  - **Source**: INT-013 (M11), INT-036, INT-045 · inventory Domain 5 + Domain 13
  - **Output**: `docs/api/domains/05-storefront/m11-cart.md#cart-actions`
  - **Must document**:
    - Before: `add` ignored variants/quantity.
    - `variant_id` required when the product has variants and must belong to it; `quantity` honoured.
    - Caps: stock (unless backorder) / `max_quantity` / 1 for auctions.
    - Bookable services: originally refused (slots = M26), completed by INT-036 — add of a bookable product needs `start_datetime` → the session's live hold (or a fresh hold, same rules) joins `cart_bookings` (quantity 1; 409 when taken); decrease/remove_line releases the hold; clearing the cart releases its holds.
    - `personalization` stored on the line (charged since INT-045).
    - Keeps the abandoned-cart snapshot.
    - Not wired: `bundle_selection` (the PDP does not send it — INT-045 open item).
  - **Done when**: each action type, its params and error statuses are documented.
  - **Status**: written in official Step 12 (2026-10-27): `docs/api/domains/05-storefront/m11-cart.md#cart-actions` (body, line key, cap order, response, side effects, every Arabic error, booking path, `bundle_selection` not wired).

- [x] **DOC-100** — Document `POST|DELETE /api/v1/cart/coupon/`
  - **Source**: INT-013 (M11) · inventory Domain 5
  - **Output**: `docs/api/domains/05-storefront/m11-cart.md#coupon`
  - **Must document**:
    - Stored in session `applied_coupon_id`.
    - Validation by `Coupon.is_valid` + `calculate_discount`; messages returned verbatim.
    - BFF row Django-first.
  - **Done when**: apply/remove flows and error messages are documented.
  - **Status**: written in official Step 12 (2026-10-27): `docs/api/domains/05-storefront/m11-cart.md#coupon` (`POST`/`DELETE`, every coupon message verbatim, previous-coupon restore on failure, session storage).

- [x] **DOC-101** — Document `POST /api/v1/cart/contact/` (abandoned-cart phone capture)
  - **Source**: INT-013 (M11), INT-019 · inventory Domain 5
  - **Output**: `docs/api/domains/05-storefront/m11-cart.md#contact`
  - **Must document**:
    - WhatsApp number → `AbandonedCart` via `attach_cart_customer`; returns 204.
    - Link with M13 abandoned-cart reminders (INT-019).
  - **Done when**: request, 204 response and the downstream effect are documented.
  - **Status**: written in official Step 12 (2026-10-27): `docs/api/domains/05-storefront/m11-cart.md#contact` (phone rule `^(967|966)\d{9}$`, `204`, downstream `AbandonedCart` effect and M13 link).

- [x] **DOC-102** — Document `POST /api/v1/cart/restore/` and the `/cart/restore/<token>` redirect
  - **Source**: INT-013 (M11) · inventory Domain 5
  - **Output**: `docs/api/domains/05-storefront/m11-cart.md#restore`
  - **Must document**:
    - Signed 7-day token; merges lines + the reminder coupon.
    - Frontend: `/cart/restore/<token>` (the link Django puts in reminders) redirects to `/cart?restore=<token>`.
    - Tests: `api/test_storefront_cart_api.py`.
  - **Done when**: token lifetime, merge rule and redirect are documented.
  - **Status**: written in official Step 12 (2026-10-27): `docs/api/domains/05-storefront/m11-cart.md#restore` (signed 7-day token, merge-by-key rule, reminder coupon, `/cart?restore=<token>` flow; the redirect page file itself could not be read (unverified)).

#### INT-014 — M12 Checkout

- [x] **DOC-103** — Document the checkout pipeline (JSON layer over the HTML checkout core)
  - **Source**: INT-014 (M12) · inventory Domain 5
  - **Output**: `docs/api/domains/05-storefront/m12-checkout.md#pipeline`
  - **Must document**:
    - Before: only the HTML checkout `products/views/cart_checkout.py::checkout` over `products/services/checkout_service.py`; legacy screens untouched.
    - Provider `products/services/storefront_checkout_service.py` + `api/views_checkout.py`.
    - Exact pipeline order: `quote_checkout` → `validate_payment_method` → `prepare_direct_payment` → wallet / Sharwa Pay / COD OTP guards → `preflight_supplier_stock` → `reserve_and_create_order` → `charge_direct_payment` → merchant credit → abandoned-cart recovery → server tracking → `notify_order_created`.
    - Loyalty check placement before any other OTP is consumed (INT-028) and booking holds turning `booked` inside `reserve_and_create_order` (INT-036).
  - **Done when**: a sequence diagram of the pipeline exists with each function named.
  - **Status**: written in official Step 12 (2026-10-27): `docs/api/domains/05-storefront/m12-checkout.md#pipeline` (JSON layer over the HTML core, Mermaid sequence diagram with each function named, 20-step table with failure statuses, loyalty check placement, booking holds turning `booked`, ordering call-out).

- [x] **DOC-104** — Document `GET /api/v1/checkout/delivery-options/`
  - **Source**: INT-014 (M12) · inventory Domain 5
  - **Output**: `docs/api/domains/05-storefront/m12-checkout.md#delivery-options`
  - **Must document**:
    - Methods priced in the cart currency converted from YER_NEW.
    - Sharwa Ship hidden when the plan lacks it (`sharwa_ship` feature).
    - Active pickup points; default fee; free-shipping flag.
  - **Done when**: response schema and visibility rules are documented.
  - **Status**: written in official Step 12 (2026-10-27): `docs/api/domains/05-storefront/m12-checkout.md#delivery-options` (response schema, YER_NEW conversion, Sharwa Ship visibility, pickup points, default fee, free-shipping flag).

- [x] **DOC-105** — Document `GET /api/v1/checkout/payment-options/`
  - **Source**: INT-014 (M12), INT-020 · inventory Domain 5
  - **Output**: `docs/api/domains/05-storefront/m12-checkout.md#payment-options`
  - **Must document**:
    - Store caps + complete gateways only; gateway `fields` describing the buyer's `purchase_code` / `pin` inputs; payout accounts (for transfers).
    - Frontend renders gateway code/PIN inputs from `fields`.
  - **Done when**: every option type and its `fields` descriptor are documented.
  - **Status**: written in official Step 12 (2026-10-27): `docs/api/domains/05-storefront/m12-checkout.md#payment-options` (every option type and conditions, gateway `fields` descriptor, payout accounts, closed Zod enum observation).

- [x] **DOC-106** — Document `POST /api/v1/checkout/quote/`
  - **Source**: INT-014 (M12), INT-028 · inventory Domain 5
  - **Output**: `docs/api/domains/05-storefront/m12-checkout.md#quote`
  - **Must document**:
    - Built by `build_order_invoice`.
    - Explicit 400 for a stale delivery method / pickup point.
    - Wallet preview split like the reservation.
    - `redeem_points` validated (program on, minimum, balance, wallet not disabled) and shown as `display_loyalty_discount`, applied before the wallet, upfront first (INT-028; before INT-028 Django answered `redeem_points` with 400).
  - **Done when**: quote request/response and every 400 case are documented.
  - **Status**: written in official Step 12 (2026-10-27): `docs/api/domains/05-storefront/m12-checkout.md#quote` (request/response, how it is built, preview split (loyalty then wallet), every 400 with its Arabic text, non-numeric method id observation).

- [x] **DOC-107** — Document `POST /api/v1/checkout/cod-otp/send/` and `…/cod-otp/verify/`
  - **Source**: INT-014 (M12), INT-017 · inventory Domain 5 + Domain 6
  - **Output**: `docs/api/domains/05-storefront/m12-checkout.md#cod-otp`
  - **Must document**:
    - Device tracker in the public schema + session/phone limits; device id derived from the session when the client sends none.
    - `verify_cod_otp` answers `cod_allowed:false` with the mock's sentence for a store-disabled phone (INT-017 COD enforcement); otherwise `cod_allowed` always true (`CentralCustomerTrust` is a merchant signal only — A.13 open item).
    - Phone-based limits (CGNAT stance: no strict per-IP limits).
  - **Done when**: both endpoints, limits and the `cod_allowed` rule are documented.
  - **Status**: written in official Step 13 (2026-10-27): `docs/api/domains/05-storefront/m12-checkout.md#cod-otp` — send and verify requests with every Arabic message, the public-schema device tracker, session and phone limits (3 per 600 s), the session-derived device id, the `cod_allowed:false` rule for a store-disabled phone, the single-use `cod_otp_verified_phone` flag and the no-per-IP stance. Stale comment in the BFF verify route reported.

- [x] **DOC-108** — Document `POST /api/v1/checkout/sharwa-pay/otp/send/`
  - **Source**: INT-014 (M12), INT-048 · inventory Domain 5 + Domain 8
  - **Output**: `docs/api/domains/05-storefront/m12-checkout.md#sharwa-pay-otp`
  - **Must document**:
    - Sends the Sharwa Pay OTP for paying at checkout and returns `display_balance`.
    - Distinct from the platform-origin Sharwa Pay customer API (INT-048 is out of scope of checkout and vice versa).
  - **Done when**: request/response and its relation to INT-048 are documented.
  - **Status**: written in official Step 13 (2026-10-27): `m12-checkout.md#sharwa-pay-otp` — request/response with `display_balance`, check order and messages, verification inside `POST checkout/`, relation to INT-048. No test covers this route (read from code only).

- [x] **DOC-109** — Document `POST /api/v1/checkout/` (place order, multipart)
  - **Source**: INT-014 (M12), INT-017, INT-028, INT-036, INT-045 · inventory Domain 5 + A.7
  - **Output**: `docs/api/domains/05-storefront/m12-checkout.md#place-order`
  - **Must document**:
    - Multipart body; `client_uuid` stored as the unique `Order.idempotency_key` inside the reservation transaction ⇒ retries and concurrent double clicks return the first order.
    - 409 `{detail, changed}` for hidden/out-of-stock lines (and for a taken booking slot in buy-now — INT-036).
    - 429 within a minute of the last order.
    - Field errors returned before any OTP is consumed.
    - Pickup ⇒ zero delivery fee + `Order.pickup_location`.
    - Buy-now uses the isolated `buy_now_cart` (and `buy_now_bookings`, INT-036).
    - Refuses `payment_method=cod` for a store-disabled phone (INT-017).
    - Loyalty: check runs before any other OTP; `redeem_points_to_wallet` converts points INSIDE the order transaction (a failed order restores them); wallet debit capped to that credit unless the buyer also chose «use wallet» (`OrderDraft.wallet_cap_sar`) — an existing balance is never spent without consent; points + wallet transactions linked to the order (INT-028).
    - Copies buyer personalization values to `OrderItem.personalization` (INT-045, migration `0236`).
    - Affiliate attribution via the `sharwa_aff` cookie (INT-034); influencer via `Order.coupon_code`.
    - Order delivery coordinates stored as `Order.delivery_latitude/longitude` (INT-021 migration `0222`).
  - **Done when**: all statuses (201/400/409/429) and the idempotency contract are documented with examples.
  - **Status**: written in official Step 13 (2026-10-27): `m12-checkout.md#place-order` — multipart fields, 201/200/400/409/429 with examples, every field-error and OTP error, idempotency (`client_uuid` → `Order.idempotency_key`), booking holds, loyalty inside the transaction, personalization copy, influencer and `sharwa_aff` affiliate commissions, delivery coordinates, pickup. The key is written by an `UPDATE` right after the reservation (reported).

- [x] **DOC-110** — Document the checkout payment-method mapping (UI ⇄ Django)
  - **Source**: INT-014 (M12) · inventory Domain 5
  - **Output**: `docs/api/domains/05-storefront/m12-checkout.md#payment-mapping`
  - **Must document**:
    - UI `cod` = Django `manual` WITHOUT receipt — offered only when nothing is due upfront, behind the WhatsApp OTP.
    - UI `manual` = transfer WITH receipt + amount (both required) — a transfer without proof is a COD order; the receipt replaces the OTP.
    - Gateways charge directly (no redirect) with the buyer's code.
    - Receipts JPEG/PNG only (`validate_receipt_image`); frontend accept lists, BFF + mock checks aligned.
    - Mock aligned: COD off with deposits; receipt required.
  - **Done when**: a mapping table with every UI method and its Django equivalent is published.
  - **Status**: written in official Step 13 (2026-10-27): `m12-checkout.md#payment-mapping` — table of UI `cod` / `manual` / `sharwa_pay` / gateway codes against the stored value, requirements and `public_method`; receipt rules and the Zod list.

- [x] **DOC-111** — Document `GET /api/v1/orders/public/<uuid>/` and `POST /api/v1/orders/<uuid>/receipt/`
  - **Source**: INT-014 (M12) · inventory Domain 5
  - **Output**: `docs/api/domains/05-storefront/m12-checkout.md#success-and-late-receipt`
  - **Must document**:
    - Success page payload.
    - Late receipt upload for transfer orders awaiting confirmation; adds a timeline event.
    - Google Ads purchase conversion fired once per order on `checkout/success/[public_uuid]` (INT-023).
    - Leftovers completed by later tasks: loyalty redemption + wallet preview / wallet OTP send (INT-028), bookable lines in buy-now (INT-036), `shopper/phone` (INT-029).
    - Tests: `api/test_storefront_checkout_api.py`.
  - **Done when**: both rows and their states are documented.
  - **Status**: written in official Step 13 (2026-10-27): `m12-checkout.md#success-and-late-receipt` — `orders/public/<uuid>/` payload and labels, polling, `orders/<uuid>/receipt/` states and timeline event. **Left open**: the Google Ads purchase conversion on `checkout/success/[public_uuid]` is not verified (the page file is nested too deep for the file bridge; no occurrence in the readable checkout sources).

#### INT-015 — M41 Order Tracking

- [x] **DOC-112** — Document `GET /api/v1/orders/track/<public_uuid>/`
  - **Source**: INT-015 (M41) · inventory Domain 5
  - **Output**: `docs/api/domains/05-storefront/m41-order-tracking.md#endpoint`
  - **Must document**:
    - Before: frontend already Django-first (`getTracking()` + BFF `orders/track/[uuid]` via `storefrontAdapter`); Django only had legacy HTML `order_status_public_view` (no shipments).
    - Provider `products/services/order_tracking_service.py` + `api/views_tracking.py`; shape = `TrackingSchema`.
    - No auth; headers `Cache-Control: no-store` + `X-Robots-Tag: noindex`; unknown UUID → 404 `{detail}`; tenant schema isolates other stores.
    - Read-only over existing models, no migration.
  - **Done when**: endpoint, headers and errors are documented.
  - **Status**: written in official Step 13 (2026-10-27): `docs/api/domains/05-storefront/m41-order-tracking.md#endpoint` — request/response, headers (`no-store`, `noindex, nofollow`), 404 cases, how `getTracking()` and the BFF row call it, tests.

- [x] **DOC-113** — Document tracking content rules (axes, cards, shipments, courier, privacy)
  - **Source**: INT-015 (M41) · inventory Domain 5
  - **Output**: `docs/api/domains/05-storefront/m41-order-tracking.md#content-rules`
  - **Must document**:
    - Two axes: financial `status` + merchant `fulfillment_status` (name/colour).
    - One card per `Fulfillment` (items from `FulfillmentItem`), or — the common case, since `Fulfillment` rows only exist with location routing/dropship — ONE card derived from the order (order-level AWB, `shipped_at`); finished order = delivered, cancelled = cancelled.
    - Latest non-cancelled `ShipmentOrder` with its non-rejected `ShipmentEvent`s newest first, without geo/actor/cost.
    - Carrier name from the 3PL registry (`sharwa_ship` = «شروة شيب»).
    - Explanation on returned / cancelled / compensated_lost.
    - Courier name + phone only while picked_up / in_transit and only for the store's own fleet / Sharwa Ship (assigned `ShippingProvider`, else the agent-app staff's provider profile).
    - Gift orders carry no amounts and no buyer data; deposit split from `upfront_required`; return-policy excerpt from `StoreSetting.return_policy`.
  - **Done when**: each rule is listed with an example payload.
  - **Status**: written in official Step 13 (2026-10-27): `m41-order-tracking.md#content-rules` — two axes, one card per `Fulfillment` or one derived card, latest non-cancelled shipment and non-rejected events, carrier name, explanations, courier visibility rules, gift privacy, deposit split, return-policy excerpt, with example payloads.

- [x] **DOC-114** — Document tracking status mapping and the pickup code lifecycle
  - **Source**: INT-015 (M41) · inventory Domain 5 + A.13
  - **Output**: `docs/api/domains/05-storefront/m41-order-tracking.md#mapping-and-pickup-code`
  - **Must document**:
    - Django `ready_for_pickup` means «ready for pickup OR shipping» → pickup order shows «جاهز للاستلام» + code; delivery order shows `preparing` «جاهز للشحن»; a `pending_pickup` AWB on a simple order reads the same.
    - Gap closed: `PickupCode` existed but nothing issued it — `ensure_pickup_code()` (6 unique digits, 30 days, idempotent) called by `fulfillment_service.mark_fulfillment_prepared` for pickup orders and lazily by the tracking read; hidden after `picked_up_at`; orders without `Fulfillment` rows cannot hold a code (model FK) — pickup point only.
    - Frontend `[NEEDS BACKEND]` notes updated (route, schema, api, BFF README); mock aligned (prepared delivery = «جاهز للشحن», pickup code only once ready, returned explanation text).
    - Out of scope / open: verifying the code at the counter (M15/M22/POS); push-on-status → INT-016 (done).
    - Tests: `api/test_order_tracking_api.py`.
  - **Done when**: the mapping table and pickup-code rules are documented with the open item flagged.
  - **Status**: written in official Step 13 (2026-10-27): `m41-order-tracking.md#mapping-and-pickup-code` — status mapping table (`ready_for_pickup` by order type), `ensure_pickup_code` lifecycle (eager + lazy, 6 digits, 30 days, hidden after pickup), limits for orders without `Fulfillment`, open item: counter verification. Roadmap's `[NEEDS BACKEND]` README update not verified.

#### INT-016 — M44 PWA

- [x] **DOC-115** — Document the PWA storefront rows (`pwa/install-event/`, `push/vapid-public-key/`, `push/subscribe/`, `push/unsubscribe/`)
  - **Source**: INT-016 (M44) · inventory Domain 5 + A.11
  - **Output**: `docs/api/domains/05-storefront/m44-pwa.md#storefront-rows`
  - **Must document**:
    - Ready rows #11–#14 in `api/views.py` via the `/api/v1/*` passthrough (`ready-api-v1.md` rows #11/#13 updated); POSTs depend on the `upstream.ts` body buffering fix (`POST /api/v1/pwa/install-event/` used to answer 400 «required field»).
    - SW `push` handler reads exactly Django's payload `{title, body, url}`.
    - Gap 2 — anti-impersonation: `push/subscribe/` takes `order_uuid` and derives the phone from that order; `customer_phone` alone is ignored (anonymous = broadcast only); anonymous re-subscribe keeps the linked phone; unknown order → 400 `{order_uuid}`.
    - Gap 3 — CGNAT stance: install-event per-IP limit 30/min → 300/min; subscribe loose 120/min ceiling; public PWA views `authentication_classes = []`.
    - Frontend: `PushSubscribe` sends `order_uuid`, re-links an existing browser subscription, offers «إيقاف التنبيهات» (US-44.4.3 → `unsubscribe`); mock aligned (order-derived phone, 300/min, same messages).
  - **Done when**: all four rows with limits and the anti-impersonation rule are documented.
  - **Status**: written in official Step 13 (2026-10-27): `docs/api/domains/05-storefront/m44-pwa.md#storefront-rows` — the four rows with limits (300/min, 120/min), the order-derived phone rule and frontend behaviour. The service-worker `push` handler could not be read (payload shape taken from `push_service`). A stale '30/min' comment in `install-events.ts` is reported.

- [x] **DOC-116** — Document order-status push notifications (`send_order_push`)
  - **Source**: INT-016 (M44) · inventory Domain 5 + A.8
  - **Output**: `docs/api/domains/05-storefront/m44-pwa.md#order-push`
  - **Must document**:
    - Gap 1: the success-page promise «سنُنبّهك عند تغيّر حالة طلبك» had no sender (only manual broadcast).
    - New `products/services/order_push_service.py` + Celery `send_order_push`: targeted pushes to active subscriptions with the order's phone (`clean_phone_number`), link `/track/<uuid>`, store name in the title.
    - Hooks: `order_events.notify_sharwaconnect_of_order_event` (SHIPPED / DELIVERED / CANCELLED / PAYMENT_RECEIVED — not CREATED); accepted `apply_shipment_transition` (picked_up / in_transit / delivered / returned); `mark_fulfillment_prepared` for pickup orders (ready_for_pickup).
    - No subscribers ⇒ no task; on_commit; never raises; one push per (order, kind) per 6 h (cache).
    - No migration.
  - **Done when**: triggers, throttle and payload are documented.
  - **Status**: written in official Step 13 (2026-10-27): `m44-pwa.md#order-push` — gap, triggers table, messages, payload, on_commit/never-raises/no-subscriber rules, 6 h de-duplication taken when the task runs.

- [x] **DOC-117** — Document merchant push rows `GET /api/v1/push/stats/` and `POST /api/v1/push/test/`
  - **Source**: INT-016 (M44) · inventory Domain 5 + A.3 + A.5
  - **Output**: `docs/api/domains/05-storefront/m44-pwa.md#merchant-push`
  - **Must document**:
    - Gap 4: JSON successor of the HTML `send_test_push_notification` (M44 US-44.5) in `api/views_push.py`.
    - `GET push/stats/` → `{active_subscribers}` (owner or `reports.view`).
    - `POST push/test/` `{title ≤ 60, body ≤ 200}` → 202 `{queued_for}`; owner only; 400 without subscribers; 429 + `Retry-After` within 60 s.
    - BFF rows `push/stats` + `push/test` via `liveOrMock(…, "pwa", …)`; «إشعارات المتصفح» card on `/dashboard/reports` (count for reports viewers, broadcast form for the owner).
    - Tests: `api/test_pwa_push_api.py`; legacy `products/test_push_notifications.py`, `test_pwa_install_tracking.py` unchanged.
  - **Done when**: both rows with gates, limits and live key `pwa` are documented.
  - **Status**: written in official Step 13 (2026-10-27): `m44-pwa.md#merchant-push` — `push/stats` and `push/test` gates, validation, 202/400/401/403/429 with `Retry-After`, BFF live key `pwa`, reports card.

#### INT-029 — M42 Wishlist & Reviews

- [x] **DOC-118** — Document `GET|POST /api/v1/shopper/phone/`
  - **Source**: INT-029 (M42) · inventory Domain 5
  - **Output**: `docs/api/domains/05-storefront/m42-wishlist-reviews.md#shopper-phone`
  - **Must document**:
    - Before: 7 storefront rows Django-first via `storefrontAdapter`, but Django had only HTML views (`products/views/customer_engagement.py`, store-review form) → 404/405 → fixtures served them.
    - Provider `products/services/engagement_service.py` + `api/views_engagement.py` (public session views, `Retry-After` on 429).
    - Session `wishlist_phone` (same key as the legacy views); no OTP (FR-42.01).
  - **Done when**: read/write of the shopper phone is documented.
  - **Status**: written in official Step 13 (2026-10-27): `docs/api/domains/05-storefront/m42-wishlist-reviews.md#shopper-phone` — GET/POST, session key `wishlist_phone`, no OTP, before/after INT-029.

- [x] **DOC-119** — Document `GET /api/v1/wishlist/` and `POST /api/v1/wishlist/toggle/`
  - **Source**: INT-029 (M42) · inventory Domain 5
  - **Output**: `docs/api/domains/05-storefront/m42-wishlist-reviews.md#wishlist`
  - **Must document**:
    - List = `ProductListSerializer` cards at live prices in `?currency` + `allow_backorder` / `is_available`; unpublished product kept as «لم يعد متاحاً»; archived product left out.
    - Toggle: session phone, body phone as fallback, 409 without either; saving needs a visible product, removing always works.
  - **Done when**: both rows with 409 rule and card fields are documented.
  - **Status**: written in official Step 13 (2026-10-27): `m42-wishlist-reviews.md#wishlist` — list payload and the three product states, toggle rules (409 without phone, save needs a visible product, remove always works).

- [x] **DOC-120** — Document `POST /api/v1/catalog/products/<id>/back-in-stock/`
  - **Source**: INT-029 (M42) · inventory Domain 5
  - **Output**: `docs/api/domains/05-storefront/m42-wishlist-reviews.md#back-in-stock`
  - **Must document**:
    - 201 on first subscription / 200 on repeat; a subscription already notified is re-armed.
  - **Done when**: statuses and re-arm rule are documented.
  - **Status**: written in official Step 13 (2026-10-27): `m42-wishlist-reviews.md#back-in-stock` — 201/200/re-arm rule, phone source, errors. The BFF route file could not be read.

- [x] **DOC-121** — Document `GET|POST /api/v1/store-reviews/`
  - **Source**: INT-029 (M42) · inventory Domain 5
  - **Output**: `docs/api/domains/05-storefront/m42-wishlist-reviews.md#store-reviews`
  - **Must document**:
    - Published at once; limit 3 per session/hour (429 + `Retry-After`).
    - Migration `products/0228_engagement_api`: `StoreReview.rating` nullable — legacy comments without stars stay out of the average and the widget (nothing invented).
  - **Done when**: list/create, rate limit and rating nullability are documented.
  - **Status**: written in official Step 13 (2026-10-27): `m42-wishlist-reviews.md#store-reviews` — list (rated only, newest 10, average), create (fields, published at once), 3 per session per hour, nullable `rating`.

- [x] **DOC-122** — Document `POST /api/v1/customers/otp/send/`
  - **Source**: INT-029 (M42) · inventory Domain 5
  - **Output**: `docs/api/domains/05-storefront/m42-wishlist-reviews.md#customer-otp`
  - **Must document**:
    - Purposes `review | auction | wishlist | back_in_stock`.
    - 60 s resend → 429 (+ `Retry-After`).
    - Standard BFF endpoint for buyer OTP outside checkout.
  - **Done when**: purposes and resend limit are documented.
  - **Status**: written in official Step 13 (2026-10-27): `m42-wishlist-reviews.md#customer-otp` — purposes, the 60 s resend rule with `Retry-After`, limits, message, verification messages; `wishlist` and `back_in_stock` purposes have no verifier in the service (reported).

- [x] **DOC-123** — Document product review submission and moderation (`POST catalog/products/<id>/reviews/`, `PATCH reviews/<id>/`)
  - **Source**: INT-029 (M42), INT-017 (M07) · inventory Domain 5 + Domain 6
  - **Output**: `docs/api/domains/05-storefront/m42-wishlist-reviews.md#product-reviews`
  - **Must document**:
    - POST: fields checked before the code; WhatsApp code consumed; stored with the buyer's `customer_key` (`ProductReview.customer_phone`, INT-017 `0218`).
    - `ProductReview.is_approved` (migration `0228`): default True keeps existing/legacy reviews visible; API reviews start False → hidden from the PDP list, the summary and the legacy HTML page until approved.
    - Moderation end to end: contract promised «سيظهر تقييمك بعد المراجعة», M07 tab showed «بانتظار المراجعة» but nothing could approve → merchant `PATCH reviews/<id>/` accepts `{approved}` (alone or with `admin_reply`); M07 reviews tab «اعتماد» button (`useApproveReview`; mock aligned).
    - Tests: `api/test_engagement_api.py` (4).
  - **Done when**: submission, approval and visibility rules are documented end to end.
  - **Status**: written in official Step 13 (2026-10-27): `m42-wishlist-reviews.md#product-reviews` — submission order (fields → code → store), `is_approved` visibility rules, merchant `PATCH reviews/<id>/` with `approved` and/or `admin_reply`, end-to-end flow from the test. **Left open**: the M07 «اعتماد» button (`useApproveReview`) and the legacy HTML page's filter were not found in the files read.

### 1.10 Domain 6 API — Customers, customer wallets & loyalty (العملاء ومحافظ العملاء والولاء)

Sharwa has no tenant customer model — a customer is DERIVED from a normalized phone (`customer_key`) across every table (FR-07.01). The customer wallet is always SAR (FR-07.04) and is the same ledger used by refunds (Domain 4) and checkout (Domain 5). Platform trust (`CentralCustomerTrust`, public) and store trust (`CustomerReliabilityRecord`) are never merged.

- [x] **DOC-124** — Write the Domain 6 API overview (derived customer model)
  - **Source**: INT-017 (M07), INT-028 (M35) · inventory Domain 6 + A.11
  - **Output**: `docs/api/domains/06-customers-wallets/README.md`
  - **Must document**:
    - Overview table: INT-017 M07 live key `customers`, `products/services/customer_service.py`, `api/views_customers.py`, 14 routes; INT-028 M35 live key `wallets` (merchant) · none (storefront), `products/services/wallet_service.py`, `api/views_wallets.py`, `products/services/storefront_wallet_service.py`.
    - Derived customer (FR-07.01): key = `customer_key` (`clean_phone_number` + `966` for 9-digit Saudi mobiles, Arabic digits accepted) so `77…` / `077…` / `96777…` merge into one customer in every table (orders, wallets, points, reliability, wishlist, back-in-stock, abandoned carts, reviews); two grouped queries (raw phone × currency, raw phone × name) merged in Python — no SQL phone expression.
    - Wallet always SAR (FR-07.04); shared ledger with refunds (INT-007/INT-026) and checkout (INT-014).
    - Trust separation (FR-07.03).
  - **Done when**: the customer identity model is explained with merge examples.
  - **Status**: written in official Step 20 (2026-10-27): `docs/api/domains/06-customers-wallets/README.md` (the two integrations at a glance with live keys, providers, route and test counts and migrations; the customer key algorithm with the `771234567` / `0771234567` / `967771234567` / `+967 771234567` / `٠٧٧١٢٣٤٥٦٧` merge table and the Saudi `0501234567` example; what counts as a customer; how the key is joined to every table; the single SAR wallet and its writers; the two trust sources; the route map and the gate table). The overview pages it links to (`../../overview/*.md`) are written in other steps.

#### INT-017 — M07 Customers

- [x] **DOC-125** — Document `GET /api/v1/customers/` (list, search, filters)
  - **Source**: INT-017 (M07) · inventory Domain 6
  - **Output**: `docs/api/domains/06-customers-wallets/m07-customers.md#list`
  - **Must document**:
    - Before: only the HTML `customer_report`.
    - Rules: placed orders = every status but `pending_payment`; `orders_count` counts them all; `display_total_spent` only the non-cancelled ones (legacy LTV rule), converted to the dashboard currency; marketplace-only customers ⇒ `phone_available=false`; name = latest order's, `other_names` the rest.
    - Gate: session → `customers.view`.
    - BFF `liveOrMock(…, "customers", …)`; fixture spend excludes cancelled orders like Django.
  - **Done when**: list fields, filters and computation rules are documented.
  - **Status**: written in official Step 20 (2026-10-27): `docs/api/domains/06-customers-wallets/m07-customers.md#list` (all filters and sorts, search by phone / name, paging `page_size` 50 max 100, the row fields with the list example from the tests, the derivation rules, staff usage tracking).

- [x] **DOC-126** — Document `GET /api/v1/customers/segments/count/`
  - **Source**: INT-017 (M07), INT-019 · inventory Domain 6
  - **Output**: `docs/api/domains/06-customers-wallets/m07-customers.md#segments`
  - **Must document**:
    - `AUDIENCE_TYPE` values verbatim.
    - Calls the campaign resolver itself (`campaigns._resolve_raw_recipients`, `dormant_days=90`) so the count equals M13's audience exactly.
    - Hand-over to INT-019: a campaign from the «خامل» segment must carry `dormant_days=90` (model default 30) — applied in INT-019.
  - **Done when**: segment types and the shared resolver are documented.
  - **Status**: written in official Step 20 (2026-10-27): `docs/api/domains/06-customers-wallets/m07-customers.md#segments` (the four segments, the `product` / `dormant_days` parameters, the `{segment, count, product}` answer, reuse of the M13 resolver). Discrepancy: the count is the campaign audience and can differ from `count` of `GET customers/?segment=…`.

- [x] **DOC-127** — Document `GET /api/v1/customers/export.csv`
  - **Source**: INT-017 (M07) · inventory Domain 6 + A.11
  - **Output**: `docs/api/domains/06-customers-wallets/m07-customers.md#export`
  - **Must document**:
    - Marketplace-only customers exported with blank phone.
    - Staff usage tracking: exports → `export_volume`; 429 on the hard limit or a critical behaviour alert today; audited `customers.export`.
    - `x-export-rows` header added to forwarded BFF response headers.
  - **Done when**: CSV columns, 429 rule and audit entry are documented.
  - **Status**: written in official Step 20 (2026-10-27): `docs/api/domains/06-customers-wallets/m07-customers.md#export` and `#export-limits` (columns, BOM and `x-export-rows`, staff alert and hard limit 5 000 with the 429 text, audit and usage rules, the CSV example from the tests).

- [x] **DOC-128** — Document the customer profile `GET /api/v1/customers/<phone>/` and its trust block
  - **Source**: INT-017 (M07) · inventory Domain 6
  - **Output**: `docs/api/domains/06-customers-wallets/m07-customers.md#profile`
  - **Must document**:
    - Profile views → `view_volume` (staff usage tracking).
    - Platform trust = sum of the phone's `CentralCustomerTrust` rows in public (chunked IN); store trust = `CustomerReliabilityRecord`; never merged (FR-07.03).
  - **Done when**: profile fields and both trust sources are documented.
  - **Status**: written in official Step 20 (2026-10-27): `docs/api/domains/06-customers-wallets/m07-customers.md#profile` (every profile field, the store trust and platform trust blocks, the automatic COD reason, the staff view counter, the 404). Discrepancy: the automatic reason is «أُوقف تلقائياً بعد {N} مرات رفض استلام.», not the shortened text of the roadmap.

- [x] **DOC-129** — Document profile sub-resources: `<phone>/orders/`, `wallet/transactions/`, `points/`, `wishlist/`, `reviews/`
  - **Source**: INT-017 (M07), INT-029 · inventory Domain 6
  - **Output**: `docs/api/domains/06-customers-wallets/m07-customers.md#sub-resources`
  - **Must document**:
    - Orders tab = Django `customers/<phone>/orders/` gated by `customers.view` (not `orders.view`).
    - Wallet transactions in SAR; points; wishlist (back-in-stock link); reviews tab filled by `ProductReview.customer_phone` (legacy name-only reviews unattributed; `approved` always true until M42 moderation).
    - `PATCH /api/v1/customers/reviews/<id>/` `{approved}` and/or `admin_reply` (INT-029).
  - **Done when**: each tab endpoint and its gate are documented.
  - **Status**: written in official Step 20 (2026-10-27): `docs/api/domains/06-customers-wallets/m07-customers.md#sub-resources` and `#review-patch` (orders tab through `order_list_item`, wallet tab, points tab, wishlist tab, reviews tab with `customer_phone`, `PATCH reviews/<id>/` and its errors). Discrepancies: the review route is `reviews/<id>/`, not `customers/reviews/<id>/`; `approved` is the real moderation flag; the wallet tab derives `actor` and `reference` differently from the M35 ledger.

- [x] **DOC-130** — Document customer notes `customers/<phone>/notes/` and `customers/notes/<id>/`
  - **Source**: INT-017 (M07) · inventory Domain 6 + A.9
  - **Output**: `docs/api/domains/06-customers-wallets/m07-customers.md#notes`
  - **Must document**:
    - New `CustomerNote` (migration `0218_customer_crm`); delete by author or owner (FR-07.08).
    - Write gate `customers.edit_profile`.
  - **Done when**: create/list/delete and the delete rule are documented.
  - **Status**: written in official Step 20 (2026-10-27): `docs/api/domains/06-customers-wallets/m07-customers.md#notes` (model, list / create / delete, the 1 000-character rules, `can_delete`, the author-or-owner delete rule with its 403 text). Discrepancies: the write gate is `customers.view`, not `customers.edit_profile`; the delete route is `customers/<phone>/notes/<note_id>/`.

- [x] **DOC-131** — Document COD decision `customers/<phone>/cod/` and checkout enforcement
  - **Source**: INT-017 (M07), INT-014 · inventory Domain 6
  - **Output**: `docs/api/domains/06-customers-wallets/m07-customers.md#cod`
  - **Must document**:
    - `CustomerReliabilityRecord.cod_status_reason / updated_at / updated_by` (migration `0218`): manual decision with reason, audited `customers.cod_disabled|enabled`, 409 when unchanged; auto-disable after refusals reads «أُوقف تلقائياً بعد N مرات».
    - COD enforcement: storefront checkout never read `cod_disabled` — `verify_cod_otp` now answers `cod_allowed:false` with the mock's sentence and `checkout/` refuses `payment_method=cod` for a disabled phone.
    - Tests: `api/test_customers_api.py`.
  - **Done when**: decision payload, audit keys and the checkout effect are documented.
  - **Status**: written in official Step 20 (2026-10-27): `docs/api/domains/06-customers-wallets/m07-customers.md#cod` and `#cod-enforcement` (request and errors in their check order, the fields written on every record of the key, the audit codes, the automatic disabling, the two checkout checks with `COD_REFUSED`, a Mermaid sequence, the test).

#### INT-028 — M35 Customer Wallets & Loyalty Points

- [x] **DOC-132** — Document merchant customer wallets `customers/wallets/`, `<pk>/`, `<pk>/transactions/`
  - **Source**: INT-028 (M35) · inventory Domain 6
  - **Output**: `docs/api/domains/06-customers-wallets/m35-wallets-loyalty.md#wallets`
  - **Must document**:
    - Before: models + HTML screens (`products/views/{wallets,loyalty}.py`), no JSON API.
    - List: `?q` phone (local `0777…` matches) or normalized name; `sort=balance|last_transaction_at`; `totals`.
    - POST create: phone → `clean_phone_number` (same key as checkout/refunds); name from the latest order.
    - Transactions: signed `amount`; `reference` = the `OrderRefund` that credited it, else the order; `WalletTransaction.actor` (from `acting_as`, else «النظام»).
    - Gates: plan feature `customer_wallets` + `customers.view` / `customers.edit_profile`.
    - BFF: 7 merchant rows via `liveOrMock(…, "wallets", …)`.
  - **Done when**: list/create/detail/transactions are documented with gates.
  - **Status**: written in official Step 20 (2026-10-27): `docs/api/domains/06-customers-wallets/m35-wallets-loyalty.md#wallets` (list with `q` / `sort` / `totals`, create with phone cleaning and the two 400s, detail with `points`, the ledger with its filters, the signed amounts, the `reference` rules and `actor`; gates with the plan feature `customer_wallets`). The five deepest BFF files could not be staged and are documented from sibling files and the register.

- [x] **DOC-133** — Document `POST /api/v1/customers/wallets/<pk>/topup/`
  - **Source**: INT-028 (M35) · inventory Domain 6 + A.7
  - **Output**: `docs/api/domains/06-customers-wallets/m35-wallets-loyalty.md#topup`
  - **Must document**:
    - Kinds `manual_topup` / `reward` / `adjustment`; a debit only as `adjustment` with a note; insufficient balance → 400.
    - `Idempotency-Key` header or body = exactly one transaction (unique `WalletTransaction.idempotency_key`, migration `0227_wallets_api`).
  - **Done when**: kinds, debit rule and idempotency are documented.
  - **Status**: written in official Step 20 (2026-10-27): `docs/api/domains/06-customers-wallets/m35-wallets-loyalty.md#topup` (body and header, the nine checks in order with every message, what is written, replay and race handling, migration `0227` fields, the test). Discrepancy: the idempotency lookup is per wallet but the unique constraint is global.

- [x] **DOC-134** — Document loyalty reads `customers/loyalty-program/`, `loyalty/points/`, `loyalty/points/<phone>/transactions/`
  - **Source**: INT-028 (M35), INT-019 · inventory Domain 6
  - **Output**: `docs/api/domains/06-customers-wallets/m35-wallets-loyalty.md#loyalty`
  - **Must document**:
    - `customers/loyalty-program/` read-only for `customers.view` (M13 `loyalty/program/` stays owner-only).
    - Points list highest first, wallet link, last earn; per-phone transactions.
    - Plan feature `loyalty_settings`; `CustomerPointsTransaction.wallet_transaction` (migration `0227`).
  - **Done when**: the three rows and their gates are documented.
  - **Status**: written in official Step 20 (2026-10-27): `docs/api/domains/06-customers-wallets/m35-wallets-loyalty.md#loyalty` (the three reads, their gates with `loyalty_settings`, the program object, the points list with `has_wallet` / `wallet_id` / `last_earn_at`, the per-phone ledger with `wallet_transaction_id`). Discrepancy: `loyalty_view` casts the two rates to integers although the model stores decimals.

- [x] **DOC-135** — Document storefront wallet & loyalty rows
  - **Source**: INT-028 (M35) · inventory Domain 6 + Domain 5
  - **Output**: `docs/api/domains/06-customers-wallets/m35-wallets-loyalty.md#storefront`
  - **Must document**:
    - Provider `products/services/storefront_wallet_service.py`, public session views, Django-first (`storefrontAdapter`, 5 rows).
    - `wallet/balance-preview/`, `wallet/otp/send/`, `loyalty/balance/`, `loyalty/otp/send/` (= legacy views, same WALLET_OTP session keys), `loyalty/redeem/` (consumes the code and marks the phone verified for 10 min — nothing moves yet).
  - **Done when**: all 5 rows with OTP/session semantics are documented.
  - **Status**: written in official Step 20 (2026-10-27): `docs/api/domains/06-customers-wallets/m35-wallets-loyalty.md#storefront` (the five public rows, the OTP session keys, TTL and rate limits, every message, what `loyalty/redeem/` consumes and marks). Discrepancy (fixture vs Django): `loyalty/redeem` answers the real balance, not the requested points.

- [x] **DOC-136** — Document checkout loyalty redemption & wallet consent sequence
  - **Source**: INT-028 (M35), INT-014 · inventory Domain 6
  - **Output**: `docs/api/domains/06-customers-wallets/m35-wallets-loyalty.md#checkout-redemption`
  - **Must document**:
    - `redeem_points` validation (program on, min, balance, wallet not disabled) → `display_loyalty_discount`, applied before the wallet, upfront first.
    - At placement: loyalty check before any other OTP consumed; `redeem_points_to_wallet` inside the order transaction (failed order restores points); wallet debit capped to that credit unless «use wallet» also chosen (`OrderDraft.wallet_cap_sar`); points + wallet transactions get the order.
    - Migration `products/0227_wallets_api` fields.
    - Tests: `api/test_wallets_api.py` (5).
  - **Done when**: a step-by-step sequence with failure/rollback behaviour is published.
  - **Status**: written in official Step 20 (2026-10-27): `docs/api/domains/06-customers-wallets/m35-wallets-loyalty.md#checkout-redemption` (the six validation checks, the upfront-first arithmetic, the placement order of the guards, the atomic block with `wallet_cap_sar`, a Mermaid sequence, the failure and rollback table, the result figures of the test, migration `0227`, the five tests). Open: a payment failure after the commit is not covered by tests and the points are not returned by the code read.

### 1.11 Domain 7 API — Marketing, storefront design & partners (التسويق والتصميم والمسوّقون والمؤثرون)

Marketing writes go to the SAME models the cart/checkout engine reads (no parallel pricing); design and most marketing areas are owner-only; affiliate attribution happens at checkout through the `sharwa_aff` cookie, now captured on the Next storefront.

- [x] **DOC-137** — Write the Domain 7 API overview
  - **Source**: INT-018 (M08), INT-019 (M13), INT-034 (M17) · inventory Domain 7
  - **Output**: `docs/api/domains/07-marketing-design-partners/README.md`
  - **Must document**:
    - Overview table: INT-018 key `design`, `products/services/design_service.py`, `api/views_design.py` (`store/theme/`, `store/theme/presets/`, `store/announcement/`, `admin/sections/*`); INT-019 key `marketing`, `products/services/marketing_service.py`, `api/views_marketing.py` (18 routes under `promotions/` + `loyalty/program/`); INT-034 key `affiliates`, `products/services/partners_service.py`, `api/views_partners.py` (per kind `affiliates`/`influencers` + `storefront/referral/`).
    - Same models as the pricing engine; owner-only areas (design; carts/campaigns/timeline/loyalty/gifting; affiliate/influencer writes).
  - **Done when**: the overview table and ownership rules are published.
  - **Status**: written in official Step 21 (2026-10-27): `docs/api/domains/07-marketing-design-partners/README.md` (overview table of the three live keys with provider files and route counts, the shared-model table, the ownership/gate matrix and the cross-domain conventions). Discrepancy: the roadmap counts "18 routes under `promotions/` + `loyalty/program/`"; code has 17 `promotions/…` routes + `loyalty/program/` = 18 in total (BFF also 18 rows).

#### INT-018 — M08 Theme Customizer

- [x] **DOC-138** — Document `GET|PATCH /api/v1/store/theme/`
  - **Source**: INT-018 (M08) · inventory Domain 7 + A.7 + A.10
  - **Output**: `docs/api/domains/07-marketing-design-partners/m08-theme-customizer.md#theme`
  - **Must document**:
    - Before: HTML «تصميم المتجر» (`StorefrontDesignForm` + `AnnouncementBarForm`).
    - Gate: owner session only — staff 403 «تصميم المتجر مقصور على مالك المتجر.»; plan feature `storefront_design`.
    - JSON or multipart `logo`; data-URL logo accepted; `null` clears; colours upper-cased `#RRGGBB`; fonts = `GOOGLE_FONT_CHOICES`; design styles; preset key or `custom`.
    - Optimistic lock: stale `version` ⇒ 409 `{detail, current_version}`; `StoreSetting.theme_version` + `theme_updated_at` (migration `0219_theme_version_section_label`) back the contract's `version` / `updated_at`.
    - Multipart forwarded as-is by the BFF (`liveOrMock(…, "design", …)`).
  - **Done when**: PATCH body, validation and 409 flow are documented.
  - **Status**: written in official Step 21 (2026-10-27): `docs/api/domains/07-marketing-design-partners/m08-theme-customizer.md#theme` (14-key row, PATCH rules with every message, upper-casing, logo as file / data URL / `null` / existing URL, preset as a label only, the 409 flow with `current_version`, version bumped on every save, migration `0219`).

- [x] **DOC-139** — Document `GET /api/v1/store/theme/presets/` and `store/announcement/`
  - **Source**: INT-018 (M08), INT-010 · inventory Domain 7
  - **Output**: `docs/api/domains/07-marketing-design-partners/m08-theme-customizer.md#presets-announcement`
  - **Must document**:
    - Presets = `products/theme_presets.py` verbatim.
    - Announcement: nine fields through `settings_service.patch_announcement` (one row and one validation with M34); plan feature `coupon` as in M34; an enabled bar needs text.
  - **Done when**: both rows are documented with the shared-validation note.
  - **Status**: written in official Step 21 (2026-10-27): `docs/api/domains/07-marketing-design-partners/m08-theme-customizer.md#presets-announcement` (the nine presets with their tokens, fonts and design styles; the nine announcement fields, shared validation with M34, enabled-bar-needs-text rule). Discrepancies: `store/theme/presets/` needs only a session (no owner check, no plan feature); the announcement route is owner-only while M34's `PATCH settings/announcement/` also lets staff with `catalog.manage` in.

- [x] **DOC-140** — Document storefront sections `admin/sections/`, `<pk>/`, `reorder/`
  - **Source**: INT-018 (M08) · inventory Domain 7 + A.10
  - **Output**: `docs/api/domains/07-marketing-design-partners/m08-theme-customizer.md#sections`
  - **Must document**:
    - Before: `admin/sections` behind `IsAdminUser` (platform superuser only); `AdminStoreSectionViewSet` and its router entry removed.
    - GET seeds default singletons; POST create; `<pk>/` PATCH/DELETE (singleton: no duplicate, no delete; type immutable; 204); `reorder/` needs every id (full order).
    - Validation = frontend contract FR-08.06 with its own error keys: `label` ≤ 80; `limit` 1–50; `product_grid` existing `category_id`; `slider`/`banner_grid` 1–12 items each with title or image; `items.<i>.image|title|link`; hero `title`/`subtitle`/`cta_text`/`link` (`/` or `https://`).
    - Item images as data URLs (jpg/png/webp/gif ≤ 5 MB) stored under `<schema>/store_sections/`; `content_data` keeps an absolute URL, never base64 (old serializer demanded an image on every item).
    - `StoreSection.label` (migration `0219`).
    - Note: a publish with many new slider images in one PATCH is bounded by `DATA_UPLOAD_MAX_MEMORY_SIZE` (8 MB).
    - Tests: `api/test_design_api.py`.
  - **Done when**: every section type's validation keys are documented.
  - **Status**: written in official Step 21 (2026-10-27): `docs/api/domains/07-marketing-design-partners/m08-theme-customizer.md#sections` (types, seeding, endpoints and statuses, structural errors, the per-type validation table with its error keys, image storage, `label` and migration `0219`, the 8 MB body bound, tests). Discrepancy: `limit` 1–50 is validated for every section type, not only `product_grid`.

#### INT-019 — M13 Marketing

- [x] **DOC-141** — Document marketing gates and `GET promotions/summary/`
  - **Source**: INT-019 (M13) · inventory Domain 7 + A.5
  - **Output**: `docs/api/domains/07-marketing-design-partners/m13-marketing.md#gates-summary`
  - **Must document**:
    - The 18 routes under `/api/v1/promotions/…`: `summary`, `coupons` · `<pk>`, `offers` · `<pk>`, `abandoned-carts` · `<pk>` · `remind`, `abandoned-cart-settings`, `campaigns` · `channels` · `<pk>` · `preview` · `send`, `timeline` · `<pk>`, `gift-settings`; + `/api/v1/loyalty/program/`.
    - Gates: coupons/offers/summary by `discounts.apply` (read) / `discounts.manage` (write); carts, campaigns, timeline, loyalty, gifting owner-only (M13 §2); plan features `coupon`, `abandoned_carts`, `campaigns`, `timeline`, `loyalty_settings`, `gift_settings`.
    - Before: HTML screens only. BFF: 18 rows via `liveOrMock(…, "marketing", …)`.
  - **Done when**: a route × gate matrix is published.
  - **Status**: written in official Step 21 (2026-10-27): `docs/api/domains/07-marketing-design-partners/m13-marketing.md#gates-summary` (route × gate matrix with both gate orders, owner-only sentences, summary row, the 18-row BFF table). Discrepancies: `promotions/campaigns/channels/` is not owner-only and has no plan feature; `promotions/summary/` has no plan feature; the route count is 18, not 19.

- [x] **DOC-142** — Document coupons `promotions/coupons/` · `<pk>/`
  - **Source**: INT-019 (M13), INT-034 · inventory Domain 7
  - **Output**: `docs/api/domains/07-marketing-design-partners/m13-marketing.md#coupons`
  - **Must document**:
    - Code upper-cased + unique; percent integer 1–100; temporal state computed like the UI.
    - Influencer coupons keep their code and cannot be deleted here.
  - **Done when**: fields and validation messages are documented.
  - **Status**: written in official Step 21 (2026-10-27): `docs/api/domains/07-marketing-design-partners/m13-marketing.md#coupons` (row, filters, the five temporal states, every validation message, influencer-coupon guard).

- [x] **DOC-143** — Document offers `promotions/offers/` · `<pk>/` and the condition mapping
  - **Source**: INT-019 (M13) · inventory Domain 7 + A.9
  - **Output**: `docs/api/domains/07-marketing-design-partners/m13-marketing.md#offers`
  - **Must document**:
    - Multipart `image`.
    - Mapping: frontend `buy_condition_type` / `buy_category` / `buy_product` / `min_total_items` = condition of EVERY offer type → Django `condition_type` / `category` / `product` / `min_total_items` for discount & free shipping; the «buy X» condition for buy_x_get_y.
    - Frontend added «شرط التطبيق» to `offer-form.tsx` + schema validation + mock.
    - Engine gap closed: `_buy_x_get_y_discount` handled only category/product — now also `all` (every cart unit) and `min_items` (once the cart reaches the minimum); migration `0220_marketing_api`: `PromotionalOffer.buy_condition_type` + `all`/`min_items`.
    - Priority follows Django (higher first — UI hint fixed).
  - **Done when**: the mapping table per offer type is published.
  - **Status**: written in official Step 21 (2026-10-27): `docs/api/domains/07-marketing-design-partners/m13-marketing.md#offers` (row, filters, priority higher-first, multipart `image`, the condition-mapping table per offer type, per-type validation, the engine gap closed for `all` / `min_items`, migration `0220`).

- [x] **DOC-144** — Document abandoned carts `promotions/abandoned-carts/` · `<pk>/` · `remind/` and `abandoned-cart-settings/`
  - **Source**: INT-019 (M13), INT-013 · inventory Domain 7
  - **Output**: `docs/api/domains/07-marketing-design-partners/m13-marketing.md#abandoned-carts`
  - **Must document**:
    - Lazy promotion, counters, items priced at the product's current price in the cart's currency.
    - Manual remind = next step through the SAME `_send_one_reminder` as the scheduled command (template, channel, step-2 coupon); 400 when no channel can deliver.
    - Settings validate template variables per reminder.
    - Restore links `/cart/restore/<token>` (INT-013).
  - **Done when**: list, remind and settings rows are documented.
  - **Status**: written in official Step 21 (2026-10-27): `docs/api/domains/07-marketing-design-partners/m13-marketing.md#abandoned-carts` (lazy promotion, counters, item prices, the four remind errors in order, channel and step-2 coupon, settings validation, restore link). Discrepancies: the restore route has a trailing slash on Django; `channel_email` / `channel_sms` are readable but not writable.

- [x] **DOC-145** — Document campaigns `promotions/campaigns/`, `channels/`, `<pk>/`, `preview/`, `send/`
  - **Source**: INT-019 (M13), INT-017 · inventory Domain 7 + A.7 + A.8
  - **Output**: `docs/api/domains/07-marketing-design-partners/m13-marketing.md#campaigns`
  - **Must document**:
    - Lifecycle draft → preview (`campaigns.resolve_audience`, channel-aware count + rendered message) → send now (`send_campaign` Celery chunks; status flipped to sent under a row lock first ⇒ double click cannot send twice) or `{schedule_at}` (future only; `PATCH {status:"draft"}` cancels).
    - Unconnected channel ⇒ 400 (WhatsApp/social = active app installation; SMS/e-mail have no real provider yet ⇒ not connected).
    - API-created campaigns carry `dormant_days=90` (M07 hand-over).
    - `MarketingCampaign.sent_at` (migration `0220`); scheduled campaigns were never sent → new Beat `dispatch_scheduled_campaigns` every 5 min per tenant.
  - **Done when**: the state machine, send/schedule semantics and Beat task are documented.
  - **Status**: written in official Step 21 (2026-10-27): `docs/api/domains/07-marketing-design-partners/m13-marketing.md#campaigns` (vocabulary, fields, state machine as a Mermaid diagram, preview, send/schedule checks in order, row-locked dispatch, channels, `dormant_days=90`, `sent_at`, the Beat task and tests).

- [x] **DOC-146** — Document `promotions/timeline/` · `<pk>/`, `promotions/gift-settings/` and `loyalty/program/`
  - **Source**: INT-019 (M13), INT-002 hand-over · inventory Domain 7
  - **Output**: `docs/api/domains/07-marketing-design-partners/m13-marketing.md#timeline-gifting-loyalty`
  - **Must document**:
    - Timeline events with optional campaign/offer links; `?from&to` overlap filter.
    - Loyalty program / gifting / summary as the contract (owner-only); `/config/` gifting/loyalty extensions handed over by INT-002 served here.
    - Tests: `api/test_marketing_api.py`.
  - **Done when**: the three areas are documented with owner-only gates.
  - **Status**: written in official Step 21 (2026-10-27): `docs/api/domains/07-marketing-design-partners/m13-marketing.md#timeline-gifting-loyalty` (timeline overlap filter and rules, gifting, loyalty programme, tests). Discrepancy: neither `StoreConfigSerializer` nor the frontend `/config/` contract carries gifting or loyalty fields; they are served only by `promotions/gift-settings/` and `loyalty/program/`.

#### INT-034 — M17 Affiliates & Influencers

- [x] **DOC-147** — Document affiliates/influencers list, create, summary, detail (`/api/v1/<kind>/…`)
  - **Source**: INT-034 (M17) · inventory Domain 7
  - **Output**: `docs/api/domains/07-marketing-design-partners/m17-affiliates-influencers.md#resources`
  - **Must document**:
    - Before: every §7 row `[NEEDS BACKEND]`; models `Affiliate`, `AffiliateClick`, `AffiliateSale` (OneToOne per order), `Influencer`, `InfluencerSale`, `Coupon.influencer`; attribution `create_affiliate_sale` (`sharwa_aff` cookie) / `create_influencer_sale` (`Order.coupon_code`); no migration.
    - Per kind (`affiliates`, `influencers`): list `?q&sort&has_pending` (q = name / phone|contact / code; sort name · pending · sales_count · clicks_count · last_sale_at, `-` = desc) + POST; `summary/`; `<id>/` GET/PATCH (`is_active` = stop).
    - Gates: session 401 (staff may read) → plan feature 403 with the mock sentences → every write owner-only 403 «إدارة المسوّقين والمؤثرين ومستحقاتهم لمالك المتجر.».
    - Units: amounts stored in SAR shown in store currency; fixed commission entered/shown in SAR («المبلغ (ر.س)»); percent as «10»; affiliate phone digits `^(967|966)\d{9}$`, unique among affiliates.
    - BFF: both catch-alls `liveOrMock(…, "affiliates", "/api/v1/<kind>/<path>/")`; `.env.example` adds `affiliates`.
  - **Done when**: both kinds' CRUD and gates are documented.
  - **Status**: written in official Step 21 (2026-10-27): `docs/api/domains/07-marketing-design-partners/m17-affiliates-influencers.md#resources` (before/after, gates with the two plan sentences and the owner-only write sentence, row shapes, list query, create/edit validation, summary, detail, BFF catch-alls). Discrepancy (UI vs Django): a zero commission is «العمولة أكبر من صفر.» in the frontend schema and «قيمة غير صحيحة.» from Django.

- [x] **DOC-148** — Document sales and payouts `<id>/sales/` and `<id>/sales/mark-paid/`
  - **Source**: INT-034 (M17) · inventory Domain 7
  - **Output**: `docs/api/domains/07-marketing-design-partners/m17-affiliates-influencers.md#payouts`
  - **Must document**:
    - `sales/?payout_status`; `order_state` active/cancelled/refunded from the order; influencer `coupon_code` = the order's coupon.
    - «المستحق» = pending commissions of PAID, non-cancelled/refunded orders minus commissions already paid for orders refunded later (clawback; may be negative); `has_pending` = owed > 0.
    - `mark-paid` `{sale_ids, dry_run?}` pays only eligible selected sales, oldest first, within the net allowance (no partial record); `dry_run` previews without writing; `pending → paid` only; audit `affiliate.payout` / `influencer.payout`.
    - Fixed for influencers: legacy «تم الدفع» paid every pending sale incl. unpaid/cancelled orders — the API applies the affiliate guard to both.
    - Mock aligned (owed = live orders minus clawback, eligible-only oldest-first).
  - **Done when**: owed formula and mark-paid algorithm are documented with a worked example.
  - **Status**: written in official Step 21 (2026-10-27): `docs/api/domains/07-marketing-design-partners/m17-affiliates-influencers.md#payouts` (sales list and `order_state`, the owed formula with clawback, the mark-paid algorithm step by step, audit codes, a worked example taken from `test_mark_paid_rules`, the influencer guard). Note: the algorithm stops at the first selected sale that does not fit the allowance.

- [x] **DOC-149** — Document `POST /api/v1/storefront/referral/` and the `sharwa_aff` cookie
  - **Source**: INT-034 (M17), INT-014 · inventory Domain 7
  - **Output**: `docs/api/domains/07-marketing-design-partners/m17-affiliates-influencers.md#referral`
  - **Must document**:
    - Gap: share link `<store origin>/?aff_id=` opened the Next storefront which captured nothing.
    - `{code}` → `{recorded}`; public; rule as `storefront.py`: active affiliate + code ≠ current cookie ⇒ `AffiliateClick` + HttpOnly `sharwa_aff` cookie 30 days.
    - BFF `api/bff/storefront/referral` (Django-first `storefrontAdapter`; mock counts the click); `ReferralCapture` in the storefront layout (once per tab session, inert in `?preview=1`); the JSON checkout reads the cookie.
    - Tests: `api/test_partners_api.py` (8) + marketing/checkout/reports suites green.
  - **Done when**: the attribution flow from link to order is documented.
  - **Status**: written in official Step 21 (2026-10-27): `docs/api/domains/07-marketing-design-partners/m17-affiliates-influencers.md#referral` (the gap, request/answer and cookie flags, the three recording conditions, `ReferralCapture`, BFF row, the link-to-order sequence diagram, `create_affiliate_sale` / `create_influencer_sale` rules, tests).

### 1.12 Domain 8 API — Finance: payments, merchant wallet, expenses & Sharwa Pay (المالية والمحفظة)

Three money ledgers — the merchant wallet (store schema, `MerchantWalletTransaction`), operating expenses (store schema), and the cross-store Sharwa Pay wallet (public schema, platform origin). Every balance change goes through an atomic manager with a row lock and an audit row; withdrawals are debited at request time and refunded on rejection (merchant wallet: by the admin action via `decide_withdrawal`; Sharwa Pay: by the platform console, INT-031). Platform dues collection is Domain 16; customer wallets are Domain 6.

- [x] **DOC-150** — Write the Domain 8 API overview (three ledgers)
  - **Source**: INT-020 (M14), INT-043 (M33), INT-048 (M40) · inventory Domain 8 + A.6
  - **Output**: `docs/api/domains/08-finance/README.md`
  - **Must document**:
    - Overview table: INT-020 key `payments`, `products/services/payments_service.py`, `api/views_payments.py`, 11 routes; INT-043 key `expenses`, `products/services/expenses_api_service.py`, `api/views_expenses.py` (`expenses/`, `expenses/<id>/`); INT-048 key `sharwa_pay`, `sharwapay/customer_api.py`, `api/views_sharwa_pay.py`, 8 routes under `sharwa-pay/`.
    - Debit-at-request + refund-on-rejection pattern; atomic managers + row locks + audit rows; per-currency totals never summed.
    - Cross-refs: console approvals (INT-031), dues collection (Domain 16), customer wallets (Domain 6); Windows local-media fix done in this batch is documented in Track 3 (A.11).
  - **Done when**: ledger diagram and ownership per ledger are published.
  - **Status**: written in official Step 22 (2026-10-27): `docs/api/domains/08-finance/README.md` (replaces the stub): overview table with keys, services, views, route and BFF-row counts (11 / 2 / 8), a Mermaid ledger diagram, ownership per ledger, the shared patterns (atomic managers, debit-at-request, per-currency totals, idempotency) and the cross-references to INT-031, Domain 16, Domain 6 and the Track 3 A.11 note.

#### INT-020 — M14 Payments & Merchant Wallet

- [x] **DOC-151** — Document payment gateways `payments/gateways/`, `<code>/`, `<code>/credentials/`
  - **Source**: INT-020 (M14) · inventory Domain 8
  - **Output**: `docs/api/domains/08-finance/m14-payments-wallet.md#gateways`
  - **Must document**:
    - Before: HTML forms only (`GatewayCredentialForm`, payout add/toggle/delete, wallet page + withdrawal form, admin actions).
    - Gates: owner only (staff 403, M14 §2); plan features `payment_gateways` (banks) / `local_wallets` (jeeb) per gateway — list omits gateways outside the plan.
    - Fields from `GATEWAY_REGISTRY.credential_fields`: jeeb `merchant_id/base_url/api_key/api_secret`; kuraimi `merchant_code/base_url/api_key/api_secret`; the screen renders whatever descriptors arrive.
    - Masking: no secret leaves the service; `masked_hint` = «••••» + last 4; `value` only for non-secret fields.
    - PUT keeps any empty field; partial save allowed (GatewayCredentialForm rule); only enabling needs every required field — «لا يمكن تفعيل … قبل تعبئة: …»; `base_url` validated as URL.
    - Disabling the last enabled gateway blocked by the «at least one payment method» guard.
  - **Done when**: per-gateway field tables and masking rules are documented.
  - **Status**: written in official Step 22 (2026-10-27): `docs/api/domains/08-finance/m14-payments-wallet.md#gateways` (gate chain with the owner-only sentence and per-gateway plan feature, field tables for `jeeb` and `kuraimi`, masking rule, PATCH enable rules with every message, partial PUT, the last-method guard). Discrepancies: only the **list** omits gateways outside the plan (detail, PATCH and PUT answer `403`); the `base_url` check accepts `http://` while its sentence says `https://`. Limitation: the `credentials` BFF file is nested too deep to stage and is documented from its siblings.

- [x] **DOC-152** — Document `GET|PATCH /api/v1/store/payments/`
  - **Source**: INT-020 (M14), INT-010 · inventory Domain 8
  - **Output**: `docs/api/domains/08-finance/m14-payments-wallet.md#store-payments`
  - **Must document**:
    - Reuses `settings_service.patch_payments`; «at least one payment method» guard (manual + Sharwa Pay + gateways); ungated by plan feature; owner only.
  - **Done when**: body, guard error and gate are documented.
  - **Status**: written in official Step 22 (2026-10-27): `docs/api/domains/08-finance/m14-payments-wallet.md#store-payments` (response with `active_payout_accounts`, body, the shared `patch_payments` guard). Note: both `store/payments/` and `wallet/dues/` are ungated by plan but still owner only.

- [x] **DOC-153** — Document payout accounts `payments/payout-accounts/`, `<pk>/`, `reorder/`
  - **Source**: INT-020 (M14) · inventory Domain 8
  - **Output**: `docs/api/domains/08-finance/m14-payments-wallet.md#payout-accounts`
  - **Must document**:
    - Plan feature `bank_transfers`; response `{count, counts, results}` banks first.
    - Duplicate numbers ignore spaces/dashes and Arabic digits.
    - Reorder takes every account of one type.
    - Delete → 400 `has_pending_withdrawal` while a pending withdrawal points at it.
  - **Done when**: CRUD, reorder and delete guard are documented.
  - **Status**: written in official Step 22 (2026-10-27): `docs/api/domains/08-finance/m14-payments-wallet.md#payout-accounts` (list envelope with `counts`, every validation message, the duplicate rule across spaces, dashes and Arabic digits, `sort_order`, the delete guard with `code: has_pending_withdrawal`, the four reorder checks). Note: `account_type` and `sort_order` are ignored by PATCH.

- [x] **DOC-154** — Document merchant wallet `wallet/`, `wallet/transactions/`
  - **Source**: INT-020 (M14) · inventory Domain 8 + A.9
  - **Output**: `docs/api/domains/08-finance/m14-payments-wallet.md#wallet`
  - **Must document**:
    - Plan feature `merchantwallet`.
    - Derived contract: `available` = stored balance; `display_reserved` = pending withdrawals sum; `display_balance` = available + reserved.
    - Migration `0221_merchant_wallet_api`: `MerchantWalletTransaction.kind` + `reference_kind/reference_id` written by `merchant_credit_service` (order_payment), `refund_service` (refund), order cancellation (adjustment), withdrawals; backfilled from fixed description wording.
  - **Done when**: balance derivation and ledger kinds are documented.
  - **Status**: written in official Step 22 (2026-10-27): `docs/api/domains/08-finance/m14-payments-wallet.md#wallet` (derived `available` / `reserved` / `balance` with a worked example, statement filters and row mapping, the ledger-kind writer table, migration `0221` and its backfill rules). Discrepancy: `commission` is declared (choices, migration, Zod) but no code writes it.

- [x] **DOC-155** — Document withdrawals `wallet/withdrawals/` and the admin decision path
  - **Source**: INT-020 (M14) · inventory Domain 8 + A.7
  - **Output**: `docs/api/domains/08-finance/m14-payments-wallet.md#withdrawals`
  - **Must document**:
    - Debited immediately (anti double-spend), refunded on rejection.
    - `Idempotency-Key` → retried POST returns the same request (200) with no second debit; `MerchantWithdrawalRequest.idempotency_key` + `payout_account` (FK SET_NULL, `payout_destination` kept as snapshot).
    - Concurrency fix: admin approve/reject via `payments_service.decide_withdrawal` (row lock + pending guard — two concurrent «reject» clicks used to refund twice).
  - **Done when**: request, idempotency and decision locking are documented.
  - **Status**: written in official Step 22 (2026-10-27): `docs/api/domains/08-finance/m14-payments-wallet.md#withdrawals` (list, request body and messages, the atomic debit, `Idempotency-Key` replay table, `decide_withdrawal` step by step, the admin actions, the double-refund bug). Discrepancies: the body field is `payout_account_id` (not `payout_account`); the admin actions pass no reason, so an admin-rejected row has `rejection_reason: null`; no HTTP route decides a merchant withdrawal.

- [x] **DOC-156** — Document platform dues `GET /api/v1/wallet/dues/`
  - **Source**: INT-020 (M14) · inventory Domain 8 + A.6
  - **Output**: `docs/api/domains/08-finance/m14-payments-wallet.md#dues`
  - **Must document**:
    - `PlatformCommissionRecord` / `AppBillingCharge`; totals per currency never summed («2.50 ر.س · $1»); `commission_enabled` from `PlatformBillingSettings`; ungated by plan feature.
    - BFF: 11 rows via `liveOrMock(…, "payments", …)`; `.env.example` adds `payments`.
    - Tests: `api/test_payments_api.py`.
    - Cross-ref: collection by the console (INT-031).
  - **Done when**: dues payload and per-currency rule are documented.
  - **Status**: written in official Step 22 (2026-10-27): `docs/api/domains/08-finance/m14-payments-wallet.md#dues` and `#bff-rows` (the two sources, per-currency totals computed over all rows, row fields, `commission_enabled`, the 11 BFF rows, `.env.example` key, tests). Note: `kind` other than `app_charge` silently means `commission`.

#### INT-043 — M33 Expenses

- [x] **DOC-157** — Document `GET /api/v1/expenses/`
  - **Source**: INT-043 (M33) · inventory Domain 8
  - **Output**: `docs/api/domains/08-finance/m33-expenses.md#list`
  - **Must document**:
    - Before: both rows `[NEEDS BACKEND]`; model `OperatingExpense` (4 categories, Decimal(14,2), `currency`, indexed `expense_date`, `note`, `created_by` → StaffMember, ordering `-expense_date, -id`), HTML `operating_expenses_view` (list + `OperatingExpenseForm` POST, session only), M25 `operating_expenses` report — no JSON and no permission key, so the frontend kept the screen owner-only although the contract carries `created_by_name`.
    - `?category&currency&from&to&page` → `{count, months:[{month, totals:[{currency, display_total}], rows:[{id, category, display_amount, currency, expense_date, note, created_by_name}]}]}`; 50 per page; each month carries the WHOLE filtered month's total per currency (`TruncMonth` × currency `Sum`, `format_money`, never mixed — FR-33.03); invalid filter values ignored (`2026-02-30` included).
  - **Done when**: response shape and month-total rule are documented.
  - **Status**: written in official Step 22 (2026-10-27): `docs/api/domains/08-finance/m33-expenses.md#list` (the before state, filters with ignored invalid values, the response shape, 50 per page, whole-month totals by `TruncMonth` x currency with the test's numbers).

- [x] **DOC-158** — Document `POST /api/v1/expenses/` and `expenses/<id>/` (405)
  - **Source**: INT-043 (M33) · inventory Domain 8 + A.5 + A.9
  - **Output**: `docs/api/domains/08-finance/m33-expenses.md#create`
  - **Must document**:
    - `{category, amount, currency, expense_date, note}` → 201 row; `created_by` = request's staff, `null` = owner; currency default SAR; future date accepted (§8); 400 `{field:[msg]}` with the mock's messages verbatim; note ≤ 500.
    - `<id>/` → 405 (FR-33.06 — no edit/delete).
    - Gate: session 401 → `expenses.manage` 403; no plan feature (FR-33.07). New permission `expenses.manage` (category «المالية») seeded to «مدير المتجر» + «مدير الفرع» by migration `0235_seed_expenses_permission` (pattern of `0210`); legacy `operating_expenses_view` now `@requires_permission('expenses.manage')`.
    - Frontend: `PERMISSION_KEYS` += `expenses.manage`; sidebar/⌘K `wallet.expenses` from `ownerOnly` to `permission: "expenses.manage"`; screen gates on the permission instead of `session.kind`; mock 403 without the key, records `full_name` as `created_by_name`, validates note length; mobile «مصروف جديد» bar `fixed inset-x-0 bottom-16 z-30`, page `pb-36`.
    - `scripts/expenses-check.ts` (manager vs owner `null` vs cashier 403; per-run `RUN` tag); BFF `api/bff/expenses/[[...path]]` → `liveOrMock(…, "expenses", "/api/v1/expenses/[<path>/]", …)`; `.env.example` lists `expenses`.
    - Tests: `api/test_expenses_api.py` (8).
  - **Done when**: create contract, 405 and permission model are documented.
  - **Status**: written in official Step 22 (2026-10-27): `docs/api/domains/08-finance/m33-expenses.md#create` (field rules with every message, `created_by` rule, default `SAR`, future dates, the `405` handler, `expenses.manage` and migration `0235`, the legacy view's decorator, `access.ts`, the check script). Limitation: the sidebar / ⌘K entry and the mobile bar were not re-read, so they are not asserted.

#### INT-048 — M40 Sharwa Pay (customer side)

- [x] **DOC-159** — Document Sharwa Pay authentication `sharwa-pay/otp/send/`, `otp/verify/`, `logout/`
  - **Source**: INT-048 (M40) · inventory Domain 8 + A.4
  - **Output**: `docs/api/domains/08-finance/m40-sharwa-pay.md#auth`
  - **Must document**:
    - Before: domain in public `sharwapay` app behind legacy HTML `tenants/sharwa_pay_views.py` (OTP per action, no lists, no JSON).
    - `otp/send {phone}` → `{ok, phone, expires_in: 600}`; `otp/verify {phone, code}` → `{ok, phone}`; `logout` → 204.
    - Public schema only (404 on a store host / `X-Store-Domain`, plus the BFF platform-origin gate).
    - CSRF on every write, login included (client refreshes once on CSRF 403).
    - Session = Django `sessionid` with key `sharwa_pay_auth_phone` (shared with legacy page), `cycle_key()` on login.
    - Code bound to the requesting session, stored as HMAC.
    - 3 sends / 10 min per NUMBER (cache), 5 wrong codes → 5-min lock per number; both 429 with `retry_after` + `Retry-After`; WhatsApp failure → 502; reasons `no_code` / `expired` / `invalid`.
    - Phone normalised like frontend `normalizePhone` (local Yemeni → 967…, 966/967 kept).
    - No session → 401 «سجّل الدخول برقم جوالك.»; every response `Cache-Control: no-store`.
  - **Done when**: the OTP login flow with all limits and errors is documented.
  - **Status**: written in official Step 22 (2026-10-27): `docs/api/domains/08-finance/m40-sharwa-pay.md#auth` (gate order including CSRF before 401, phone normalisation, send and verify with every message and `reason`, limits and the HMAC record, `cycle_key`, logout). Discrepancy: the wrong-code counter lives in the session record while the lock is per number, so a new send resets the counter; a failed delivery still uses one of the 3 sends.

- [x] **DOC-160** — Document `GET sharwa-pay/wallet/` and `transactions/`
  - **Source**: INT-048 (M40) · inventory Domain 8
  - **Output**: `docs/api/domains/08-finance/m40-sharwa-pay.md#wallet-transactions`
  - **Must document**:
    - `wallet` → `{customer_phone, customer_name, is_active, exists, balances[4]: {currency, display_balance, balance}}`; login does NOT create a wallet (`exists:false` + four zero rows); suspended → `is_active:false`.
    - `transactions?currency&reason&page` → `{count, results[20]}` with `{id, transaction_type, reason, display_amount, currency, display_balance_after, source_tenant_schema, source_store_name, source_store_available, source_order_id, related_request, created_at}`.
    - Mapping: `display_balance_after` = audit row's real `balance_after`; `source_store_name/available` from `tenants.Client` by `source_tenant_schema` (missing/suspended → «متجر غير متاح»); `related_request` parsed from description `#<id>` and checked against the wallet's own requests.
  - **Done when**: both payloads and mappings are documented.
  - **Status**: written in official Step 22 (2026-10-27): `docs/api/domains/08-finance/m40-sharwa-pay.md#wallet-transactions` (wallet payload and `exists`, statement filters and field mapping, the seven reasons, `related_request` parsing). Discrepancy: the sentence «متجر غير متاح» is not produced by the server — it sends `source_store_name: null` and `source_store_available: false`.

- [x] **DOC-161** — Document `GET sharwa-pay/requests/`
  - **Source**: INT-048 (M40) · inventory Domain 8
  - **Output**: `docs/api/domains/08-finance/m40-sharwa-pay.md#requests`
  - **Must document**:
    - `{topups[], withdrawals[]}`; a Kuraimi transfer with no wallet yet (`wallet=None`, `claimed_phone`) listed to its number's owner; `rejection_reason` only on rejected rows.
  - **Done when**: request list shape is documented.
  - **Status**: written in official Step 22 (2026-10-27): `docs/api/domains/08-finance/m40-sharwa-pay.md#requests` (both lists, the 100 cap, the unattached Kuraimi transfer shown by `claimed_phone`, `rejection_reason` rules).

- [x] **DOC-162** — Document `POST sharwa-pay/topups/` (multipart)
  - **Source**: INT-048 (M40), INT-031 · inventory Domain 8
  - **Output**: `docs/api/domains/08-finance/m40-sharwa-pay.md#topups`
  - **Must document**:
    - → 201 `{id, status: "pending"}`; receipt jpg/jpeg/png/webp/gif ≤ 5 MB AND a real image (Pillow); `bank_transaction_id` unique at DB level (a rejected request's number cannot be reused — mock allowed it); no credit here — approval by console (INT-031); first top-up creates the wallet.
    - Suspended wallet → 403 «المحفظة موقوفة — تواصل مع الدعم.».
    - Bug fixed: `apply_credit_if_approved` labelled ANY top-up with a bank transaction id as `topup_auto`; now «auto» = transaction id with NO receipt (Kuraimi webhook only); customer top-ups credit as `topup_manual` («شحن بمراجعة»). No migration.
  - **Done when**: upload rules, uniqueness and labelling are documented.
  - **Status**: written in official Step 22 (2026-10-27): `docs/api/domains/08-finance/m40-sharwa-pay.md#topups` (field rules and the four receipt checks with messages, DB-level uniqueness, first top-up creates the wallet, the credit guard, the `topup_auto` / `topup_manual` labelling fix, a Mermaid sequence).

- [x] **DOC-163** — Document `POST sharwa-pay/withdrawals/`
  - **Source**: INT-048 (M40), INT-031 · inventory Domain 8
  - **Output**: `docs/api/domains/08-finance/m40-sharwa-pay.md#withdrawals`
  - **Must document**:
    - `{amount, currency, payout_destination}` → 201 `{id, status, display_balance_after}`.
    - Request row + `debit(... 'withdrawal')` in one atomic block (`SharwaPayWalletManager`, row lock + audit row); description carries `#<request id>`; insufficient / no wallet → 400 `{amount:[«الرصيد غير كافٍ.»]}` with no orphan request; suspended → 403.
    - Console confirm/reject + reversal (INT-031).
    - BFF `/api/bff/sharwa-pay/*` → `liveOrMock(…, "sharwa_pay", "/api/v1/sharwa-pay/<path>/")` behind the platform-origin 404; `.env.example` adds `sharwa_pay`. Out of scope: checkout «pay with Sharwa Pay» (INT-014), console approvals (INT-031).
    - Tests: `api/test_sharwa_pay_api.py` (9).
  - **Done when**: withdrawal atomicity and errors are documented.
  - **Status**: written in official Step 22 (2026-10-27): `docs/api/domains/08-finance/m40-sharwa-pay.md#withdrawals` (body and messages, the order of answers, the atomic request + debit with no orphan, reversal by the console, the BFF platform-origin gate, tests). Open item: no `Idempotency-Key` on this route.

### 1.13 Domain 9 API — B2B wholesale (البيع بالجملة B2B)

B2B drafts are approval-gated orders (`ApprovalRequest`, M18 queue — Domain 12) created by staff; quantity (tier) prices are a catalog extension charged by the cart/checkout (Domain 5). Draft rows were already Django's through the passthrough; options and tier-price editor rows are on the `b2b` switch, independent of `products`.

- [x] **DOC-164** — Write the Domain 9 API overview
  - **Source**: INT-044 (M36) · inventory Domain 9 + A.2 + A.3
  - **Output**: `docs/api/domains/09-b2b/README.md`
  - **Must document**:
    - Live switch `b2b` (options + tier prices via `B2B_LIVE_RULES` in `src/lib/bff/live-products.ts`) · none for draft rows (passthrough); providers `products/services/b2b_api_service.py`, `api/views_b2b.py`, `products/services/tier_pricing.py`, `api/views.py` (drafts).
    - Routes: `orders/b2b-options/`, `products/<id>/tier-prices/[<tier_id>/]`, `orders/b2b-draft/`, `orders/b2b-drafts/`, `orders/b2b-draft/<approval_id>/resolve/`.
    - Haggling drafts (`NegotiationDraft`) have no screen (§10) — not wired (open item).
    - No migration.
  - **Done when**: overview table and open item are published.
  - **Status**: written in official Step 43 (2026-10-28): `docs/api/domains/09-b2b/README.md` (route table with BFF paths and switches, providers, the no-migration note, the `NegotiationDraft` open item; no discrepancies).

- [x] **DOC-165** — Document `GET /api/v1/orders/b2b-options/`
  - **Source**: INT-044 (M36) · inventory Domain 9
  - **Output**: `docs/api/domains/09-b2b/m36-b2b-wholesale.md#options`
  - **Must document**:
    - `{roles (active, system roles first), locations (active), multi_location, default_currency}` for `orders.create_b2b` OR `orders.approve_b2b`.
    - BFF `api/bff/b2b/[[...path]]` → `options` via `liveOrMock(…, "b2b", "/api/v1/orders/b2b-options/", …)`; mock-only `_test/bump` hook stays on fixture.
  - **Done when**: payload and gate are documented.
  - **Status**: written in official Step 43 (2026-10-28): `m36-b2b-wholesale.md` §4.1 (payload with the system-roles-first ordering, either-permission gate, BFF forwarding rule and the `_test/bump` fixture note; no discrepancies).

- [x] **DOC-166** — Document tier prices `products/<id>/tier-prices/` and `…/<tier_id>/`
  - **Source**: INT-044 (M36) · inventory Domain 9
  - **Output**: `docs/api/domains/09-b2b/m36-b2b-wholesale.md#tier-prices`
  - **Must document**:
    - GET (`inventory.view`); POST `{min_quantity, price}` → 201 the new list (`catalog.manage`); DELETE `<tier_id>/` → the new list / 404 «السعر غير موجود.».
    - Rows `{id, min_quantity, price, display_price}` ascending (`format_money` in the product's currency).
    - Messages verbatim: «أدخل عدداً صحيحاً موجباً.» · «يوجد سعر لهذه الكمية مسبقاً.» (also on the unique-constraint race) · «أدخل سعراً صحيحاً.».
    - Each add/delete writes a `tier_prices` row to the product change log under the actor's name.
    - BFF rule: `B2B_LIVE_RULES` sends `products/<id>/extras/tier-prices[/<tier_id>]` to Django when `b2b` is live, independent of `products` (other extras moved with INT-045).
  - **Done when**: CRUD, messages and change-log effect are documented.
  - **Status**: written in official Step 43 (2026-10-28): `m36-b2b-wholesale.md` §4.2 (row shape, all three messages verbatim incl. the `IntegrityError` race path, 404 sentences, `ProductChangeLog` `tier_prices` trail with the «12+ → 90.00» format, `B2B_LIVE_RULES` mapping; no discrepancies).

- [x] **DOC-167** — Document tier pricing in cart/checkout (`tier_pricing.unit_price`)
  - **Source**: INT-044 (M36), INT-013, INT-045 · inventory Domain 9
  - **Output**: `docs/api/domains/09-b2b/m36-b2b-wholesale.md#unit-price-precedence`
  - **Must document**:
    - Gap 1: quantity prices shown on the PDP but never charged → `products/services/tier_pricing.py` `unit_price`: variant price ?? formula ?? highest tier ≤ quantity ?? base (like the PDP).
    - Used by `Cart.__iter__` (cart, `/api/v1/cart/`, checkout); `tier_prices` prefetched; local import inside `__iter__` to avoid a circular import.
    - Used by the B2B draft: each line = the tier price converted from the product's currency to the draft's (it used to store the raw product number in another currency).
  - **Done when**: precedence order and consumers are documented.
  - **Status**: written in official Step 43 (2026-10-28): `m36-b2b-wholesale.md` §4.3 (the three-step precedence, currency conversion, `Cart.__iter__` with the prefetched tiers and local import, the draft's converted-to-draft-currency rule; no discrepancies).

- [x] **DOC-168** — Document B2B drafts `orders/b2b-draft/`, `orders/b2b-drafts/`, `…/<approval_id>/resolve/`
  - **Source**: INT-044 (M36), INT-007, INT-022 · inventory Domain 9 + A.11
  - **Output**: `docs/api/domains/09-b2b/m36-b2b-wholesale.md#drafts`
  - **Must document**:
    - Passthrough rows; POSTs reach Django with a body only since the `upstream.ts` buffering fix.
    - Create needs a staff session (`ApprovalRequest.requested_by`, INT-007); refuses unsupported currency «عملة غير مدعومة.»; in a multi-branch store a draft without a branch refused (it silently took the first one); only active branches accepted (gap 4).
    - List visible with `orders.create_b2b` OR `orders.approve_b2b` (gap 2); adds `created_by_name` (requester, else `created_by_staff`) and `escalated_at`, escalated first then newest (§8, gap 3).
    - Resolve unknown approval → 404 «طلب الموافقة غير موجود.» (gap 5); approvals resolved through M18 `resolve_order_approval` so the linked order follows the decision (INT-022).
    - Frontend: mock refuses unsupported currency like Django; `.env.example` lists `b2b`; `scripts/b2b-check.ts` `requireMocks()` preflight (checks `x-sharwa-mock`).
    - `ready-api-v1.md` «Ready» rows changed shape → re-audit (A.13).
    - Tests: `api/test_b2b_api.py` (8).
  - **Done when**: create/list/resolve contracts with all five gaps closed are documented.
  - **Status**: written in official Step 43 (2026-10-28): `m36-b2b-wholesale.md` §4.4 (create body table with every verbatim error, staff-session gate, currency whitelist, the explicit-branch rule with its refusal sentence, zero-trust pricing, the list row with `created_by_name`/`escalated_at` and escalated-first ordering, resolve with the 404/403/409 matrix, `resolve_order_approval` linkage, mock/`requireMocks()` notes, the 8 test names, the A.13 re-audit open item; no discrepancies).

### 1.14 Domain 10 API — Inventory, locations & procurement (المخزون والمواقع والمشتريات)

One stock ledger (`StockMovement`) fed by adjustments, write-offs, sales, returns, POS and PO receiving. With multi-location on, `LocationInventory` rows are the source and a mirror signal rewrites variant/product stock; otherwise variant stock → `recalculate_stock_from_variants`. Write-offs and purchase orders are approval-gated through the M18 queue (Domain 12); returns restock (Domain 4) and POS sales (Domain 13) write into the same ledger.

- [x] **DOC-169** — Document the inventory list endpoint (`GET /api/v1/inventory/`)
  - **Source**: INT-024 (M21) · inventory Domain 10
  - **Output**: `docs/api/domains/10-inventory-locations-procurement/m21-inventory.md`
  - **Must document**:
    - Provider `products/services/inventory_service.py` + `api/views_inventory.py`; before INT-024 Django had only the HTML `inventory_hub_view` + `update_product_stock` (no JSON API).
    - One row per product with its variants nested under it; parent quantity = variant sum; parent status = worst status in the order `out › backorder › low › in_stock`.
    - `?location` — status computed on the location's `available` only when `?location` is given AND multi-location is on.
    - `?q` — shared Arabic normalization (A.11, `src/lib/i18n/normalize.ts` ↔ Python ↔ PostgreSQL `lower(translate(…))`) over name / SKU / barcode / variant SKUs.
    - Filters `status`, `category`, `is_serialized`.
    - `reserved_total` = sum of active, unexpired `InventoryReservation` rows.
    - Gate: session (401) → plan feature `inventory` (legacy `require_feature`, 403) → `inventory.view` (403).
  - **Done when**: every query param, the status precedence and `reserved_total` are documented with a sample response.
  - **Status**: written in official Step 23 (2026-10-27): `docs/api/domains/10-inventory-locations-procurement/m21-inventory.md#list` (gate chain, every query param incl. `page_size` 10…100, status precedence `out › backorder › low › in_stock`, `?location` basis, normalized search over name/SKU/barcode/variant SKUs, `reserved_total`, sample response from the test). Discrepancy: the search runs in Python, not through the PostgreSQL `translate` twin.

- [x] **DOC-170** — Document inventory counters and CSV export (`inventory/counters/`, `inventory/export.csv`)
  - **Source**: INT-024 (M21) · inventory Domain 10
  - **Output**: `docs/api/domains/10-inventory-locations-procurement/m21-inventory.md`
  - **Must document**:
    - `counters/` — per-status counters + `pending_writeoffs` (count of pending `stock_writeoff` approvals).
    - `export.csv` — UTF-8 BOM, one line per sellable unit (product without variants or each variant), permission `reports.export`, audit-logged; BFF forwards `x-export-rows` (A.11).
  - **Done when**: counters keys and CSV columns/BOM/permission/audit are documented.
  - **Status**: written in official Step 23 (2026-10-27): `m21-inventory.md#counters-export` (counter keys, `pending_writeoffs`, CSV columns, BOM, `QUOTE_ALL`, headers incl. `X-Export-Rows`, `reports.export`, audit row `inventory.export`). Discrepancy: the mock export sets no `x-export-rows`, names the file `inventory.csv` and leaves the header unquoted.

- [x] **DOC-171** — Document stock adjustments (`POST inventory/adjustments/`)
  - **Source**: INT-024 (M21) · inventory Domain 10
  - **Output**: `docs/api/domains/10-inventory-locations-procurement/m21-inventory.md`
  - **Must document**:
    - Body accepts either a `delta` or a `new_quantity`; reasons limited to `manual_adjust` / `restock`; a `note` is required when decreasing.
    - No negative stock unless the product allows backorder.
    - Serialized / bundle / auction products refused with the mock's messages (quote them verbatim from the mock).
    - Multi-location ⇒ `location_id` required and the `LocationInventory` row is the source (the existing mirror signal rewrites variant/product stock); otherwise a variant adjustment → `recalculate_stock_from_variants`.
    - Every adjustment writes a `StockMovement` with `actor` (from `acting_as`, else «النظام») and `quantity_after`.
    - Permission `inventory.adjust`; reused by M22 `locations/<pk>/inventory/adjust/` with `location_id` forced (INT-025).
  - **Done when**: request schema, every refusal case and ledger side effect are documented.
  - **Status**: written in official Step 23 (2026-10-27): `m21-inventory.md#adjustments` (request schema, 12 ordered refusals with verbatim messages, the three product-type refusals identical to the mock, row/variant/product write paths, ledger `actor` + `quantity_after`, reuse by M22). Open item: no `Idempotency-Key`.

- [x] **DOC-172** — Document movements, items and reservations (`inventory/movements/`, `inventory/items/`, `inventory/reservations/`)
  - **Source**: INT-024 (M21) · inventory Domain 10
  - **Output**: `docs/api/domains/10-inventory-locations-procurement/m21-inventory.md`
  - **Must document**:
    - `movements/` — `net_delta` per row; filters `product` / `variant` / `location` / `reason` / `from` / `to`; fields `actor`, `quantity_after`, `reference_type`, `reference_id`.
    - Legacy rows (pre-`0225`): reference parsed from the note «طلب #N» / «أمر شراء #N»; balance derived backwards from current stock; PO receiving now stores its reference + actor.
    - `items/` — serialized `InventoryItem` units with `location` and `order` (falls back to `meta.order_id`); paginated (the mock now pages like Django; tables use manual pagination).
    - `reservations/` — an expired active hold is shown `released` (self-healing #33); reference mapping `order:N` → order, `b2b:N` → b2b_draft, otherwise cart; paginated.
    - Permission `inventory.view`.
  - **Done when**: filters, reference mapping and self-healing release rule are documented.
  - **Status**: written in official Step 23 (2026-10-27): `m21-inventory.md#ledger` (movement filters, `net_delta`, reference mapping incl. legacy note parsing and backward balance, PO receiving reference/actor, serial units with `meta.order_id` fallback, reservations with the self-healing release and `order`/`b2b_draft`/`cart` mapping). Discrepancy: legacy notes «استرجاع/إرجاع #N» are parsed too.

- [x] **DOC-173** — Document write-offs and their M18 approval flow (`inventory/writeoffs/` GET/POST)
  - **Source**: INT-024 (M21), INT-022 (M18) · inventory Domain 10
  - **Output**: `docs/api/domains/10-inventory-locations-procurement/m21-inventory.md`
  - **Must document**:
    - POST creates an `ApprovalRequest` of type `stock_writeoff` for «مدير المتجر»; nothing is deducted at request time; `ApprovalRequest.payload` holds the write-off snapshot; `ApprovalRequest.location` nullable for single-location stores (decided by the approver role at any location).
    - Approval via M18 `approvals/<id>/resolve/` approved ⇒ `apply_writeoff` deducts in the same transaction (`manual_adjust`, reference `approval`); if stock no longer covers the quantity the decision is refused (400) and the request stays pending.
    - The M18 approvals list shows the quantity/note summary.
    - Permission `inventory.writeoff`.
  - **Done when**: the request → approve → deduct sequence (incl. the 400 refusal) is shown as a sequence diagram.
  - **Status**: written in official Step 23 (2026-10-27): `m21-inventory.md#writeoffs` (POST body and ordered errors, `payload` snapshot, nullable `location` + `can_decide`, M18 resolve with `apply_writeoff` in one transaction, Mermaid request → approve → deduct sequence incl. the 400 rollback, approvals-list summary). Discrepancies: approver role falls back to the first active role; the resolve route needs plan feature `staff_rbac` (off by default).

- [x] **DOC-174** — Document M21 data-model changes, BFF wiring and tests
  - **Source**: INT-024 (M21) · inventory Domain 10, A.3, A.9, A.12
  - **Output**: `docs/api/domains/10-inventory-locations-procurement/m21-inventory.md`
  - **Must document**:
    - Migration `products/0225_inventory_api`: `StockMovement.actor` / `quantity_after` / `reference_type` / `reference_id` (`record_stock_movement` fills actor from `acting_as` else «النظام» and the balance at write time); `InventoryItem.location` / `order`; `ApprovalRequest.payload` + nullable `location`.
    - Full gate list: plan feature `inventory` + `inventory.view` / `inventory.adjust` / `inventory.writeoff` (+ `reports.export` for the CSV).
    - BFF: the 8 handlers go through `liveOrMock(…, "inventory", …)`; live key `inventory` (missing from `.env.example` — A.13 inconsistency).
    - Tests: `api/test_inventory_api.py` (9).
  - **Done when**: the module page has a "Data model", "Gates" and "Tests" section matching the above.
  - **Status**: written in official Step 23 (2026-10-27): `m21-inventory.md#bff`, `#data-model`, `#gates`, `#tests` (8 BFF files, `0225` field table, full gate list, the 9 tests by name). Discrepancy: 8 route files export 9 handlers; `.env.example` still lacks `inventory` (DOC-461, Step 52).

- [x] **DOC-175** — Document the locations list, create and mode switch (`locations/`, `locations/mode/`, `staff-options/`)
  - **Source**: INT-025 (M22), INT-010 (M34) · inventory Domain 10
  - **Output**: `docs/api/domains/10-inventory-locations-procurement/m22-locations.md`
  - **Must document**:
    - Provider `products/services/location_service.py` + `api/views_locations.py` (14 routes); before: HTML screens only (`products/views/locations.py`: list/form/toggle/mode, location inventory, staff).
    - `GET locations/` — `?q` Arabic-normalized over name/code/city, `flag`, `ownership`, `is_active`; parents first, each child right after its parent; `products_count` = distinct products with on-hand > 0; `multi_location_enabled`.
    - `POST locations/` — create (owner-only).
    - `locations/mode/` — calls the M34 `settings_service.set_multi_location`: 409 + `conflicts` unless `merge`.
    - `staff-options/` — active `StaffMember` list.
    - Gates: plan feature `multi_location`; reads any session; defining locations/rules/mode owner-only «إدارة المواقع مقصورة على مالك المتجر.».
  - **Done when**: list ordering, filters, mode 409 contract and owner-only message are documented.
  - **Status**: written in official Step 23 (2026-10-27): `docs/api/domains/10-inventory-locations-procurement/m22-locations.md#list-create-mode` (gate chain, 14-route summary, list filters and parent-then-children ordering, `products_count`, create, mode 409 contract with `conflicts`, staff options, owner-only message). Discrepancy: the 409 applies only when turning the mode off with stock in more than one location.

- [x] **DOC-176** — Document location detail, update and deactivation impact (`locations/<pk>/`, `locations/<pk>/deactivation-impact/`)
  - **Source**: INT-025 (M22) · inventory Domain 10
  - **Output**: `docs/api/domains/10-inventory-locations-procurement/m22-locations.md`
  - **Must document**:
    - GET/PATCH `locations/<pk>/` (owner-only write).
    - `deactivation-impact/` — on-hand sum + open `Fulfillment`s in pending/preparing/ready.
    - Mapping: franchise `contract_ends_at` ↔ `contract_end` (`contract_start` = creation day); supplier `contact` stored by channel (whatsapp → `supplier_contact_phone`, email → `supplier_email`, api_webhook → `api_endpoint_url`, http(s) only); conditional sections dropped when their trigger is off (a legacy `is_transient` locker is kept); virtual ⇒ no coordinates; parent cycles refused; `display_type` = Django `Location.display_type` (the mock's derivation had drifted and now ports it verbatim).
    - Fields from migration `0226`: `Location.external_refs` (generic `[{system, ref}]`, separate from the 3PL `LocationExternalRef` snapshot), `LockerDetails.provider_name` / `locker_code` (capacity ↔ `compartment_count`), `VehicleDetails.driver_phone` (falls back to the linked driver's phone).
  - **Done when**: every type-specific section (franchise, supplier, locker, vehicle, virtual) has its field mapping table.
  - **Status**: written in official Step 23 (2026-10-27): `m22-locations.md#detail-update` (detail object, writable-field rules, mapping tables for hours, locker, franchise, dropship supplier, vehicle, virtual and `external_refs`, `display_type` rule table, deactivation impact, `0226` fields).

- [x] **DOC-177** — Document location inventory endpoints (`locations/<pk>/inventory/`, `inventory/adjust/`, `inventory/<unit>/`)
  - **Source**: INT-025 (M22), INT-024 (M21) · inventory Domain 10
  - **Output**: `docs/api/domains/10-inventory-locations-procurement/m22-locations.md`
  - **Must document**:
    - `inventory/` — rows below their reorder point first; the reorder point falls back to the product's low-stock threshold.
    - `inventory/adjust/` — INT-024 `inventory_service.adjust` with `location_id` forced.
    - `inventory/<unit>/` PATCH — unit key `p<pid>` | `v<vid>-<pid>`; creates the `LocationInventory` row when missing; quarantine may not exceed on-hand − reserved.
    - Permissions `inventory.view` / `inventory.adjust`.
  - **Done when**: the unit-key grammar and quarantine rule are documented with examples.
  - **Status**: written in official Step 23 (2026-10-27): `m22-locations.md#location-inventory` (row list with below-reorder-first ordering and reorder-point fallback, adjust with forced `location_id`, unit-key grammar table with examples, row creation, quarantine cap with test examples, permissions). Discrepancy: the mock route doc comment still names a bare `v<vid>` key.

- [x] **DOC-178** — Document location staff assignments (`locations/<pk>/staff/`, `staff/<aid>/`)
  - **Source**: INT-025 (M22), INT-022 (M18) · inventory Domain 10
  - **Output**: `docs/api/domains/10-inventory-locations-procurement/m22-locations.md`
  - **Must document**:
    - One operational role per staff member per location (re-assigning replaces it).
    - Permission `staff.manage_assignments`; never on yourself (same rule as M18).
  - **Done when**: the replace-on-reassign rule and self-assignment refusal are documented.
  - **Status**: written in official Step 24 (2026-10-27): `m22-locations.md#staff` (assignment object and role table, list, `POST` with the replace-on-reassign table `201`/`200`, the self-assignment refusal with its order of checks, `DELETE`, BFF and mock differences). Discrepancy: the self-check compares ids as strings, so `5.0` / `"05"` may bypass it (derived from code, not run). Limitation: `[id]/staff/[aid]/route.ts` is too deeply nested to stage.

- [x] **DOC-179** — Document order routing rules (`routing-rules/`, `<pk>/`, `reorder/`, `preview/`)
  - **Source**: INT-025 (M22) · inventory Domain 10
  - **Output**: `docs/api/domains/10-inventory-locations-procurement/m22-locations.md`
  - **Must document**:
    - CRUD on rules (owner-only); `reorder/` takes the full id set only; priorities always renumbered 1..n; rule `name` generated server-side.
    - `preview/` = first active matching rule (`location_routing_service._rule_matches`), else the first active shipping location.
  - **Done when**: renumbering, generated names and preview fallback are documented.
  - **Status**: written in official Step 24 (2026-10-27): `m22-locations.md#routing-rules` (rule object, list, create/patch/delete, renumbering to 1..n, generated name, full-set `reorder/`, `preview/` with the `_rule_matches` table and fallback, mock differences). Discrepancies: rule `is_active` and `name` are not in the JSON; the reorder route comment omits `results`.

- [x] **DOC-180** — Document M22 BFF wiring and tests
  - **Source**: INT-025 (M22) · A.3, A.9, A.12
  - **Output**: `docs/api/domains/10-inventory-locations-procurement/m22-locations.md`
  - **Must document**:
    - Migration `products/0226_locations_api` (fields above).
    - The 14 BFF handlers go through `liveOrMock(…, "locations", …)`; live key `locations` (missing from `.env.example` — A.13).
    - Tests: `api/test_locations_api.py` (8).
  - **Done when**: the page lists all 14 routes in one table with method/gate/BFF row.
  - **Status**: written in official Step 24 (2026-10-27): `m22-locations.md#bff` (the 14 routes in one table with method, Django gate, BFF file and mock guard; live key `locations` and the `.env.example` gap; the 7 tests mapped to sections). Discrepancy: the roadmap says 8 tests, the file has 7.

- [x] **DOC-181** — Document suppliers (`suppliers/`, `suppliers/<id>/`)
  - **Source**: INT-035 (M23) · inventory Domain 10
  - **Output**: `docs/api/domains/10-inventory-locations-procurement/m23-procurement.md`
  - **Must document**:
    - Provider `products/services/procurement_service.py` + `api/views_procurement.py`; before: every §7 row `[NEEDS BACKEND]`, Django had `Supplier`, `PurchaseOrder`, `PurchaseOrderLineItem`, the approval/receive core (`purchase_order_service`) and HTML only.
    - `GET ?q&page` · POST; `<id>/` GET/PATCH/DELETE.
    - Name unique case-insensitively; DELETE refused 409 while ANY purchase order references the supplier (PROTECT — deactivate instead; mock aligned).
    - Migration `0230_procurement_api`: `Supplier.address` / `tax_number`, phone optional (`SupplierForm`).
    - Gates FR-23.01: read `suppliers.manage` OR `suppliers.approve`; writes `suppliers.manage`; no plan feature (the legacy screens have none).
  - **Done when**: uniqueness and delete-protection rules have example error bodies.
  - **Status**: written in official Step 24 (2026-10-27): `m23-procurement.md#suppliers` (supplier object, list with `page_size`, create/patch rules and messages with example error bodies, delete protection `409` with `orders_count`, gates, `0230` fields). Discrepancy: `page_size` is also read by the supplier list.

- [x] **DOC-182** — Document purchase-order list, draft creation, form options and product picker
  - **Source**: INT-035 (M23) · inventory Domain 10
  - **Output**: `docs/api/domains/10-inventory-locations-procurement/m23-procurement.md`
  - **Must document**:
    - `GET purchase-orders/?status&supplier&location&from&to&q&page&page_size` — `q` = supplier name, line SKU, or the number `PO-0012` / `12`.
    - POST creates a draft; `form-options/`; `products/?q` — products + variants, cost converted to the store currency; serialized/bundle/auction excluded.
    - `number` = `PO-0001` (derived, also used by the M18 approvals card).
    - Quantities whole numbers; unit cost ≤ 2 decimals in the order currency (store currency at creation); single-location stores use the first active location.
  - **Done when**: the number format and line validation rules are documented.
  - **Status**: written in official Step 24 (2026-10-27): `m23-procurement.md#po-list-create` (`PO-0001` number rule, list filters and `q` forms, create with location rules, line validation table, form options, line picker).

- [x] **DOC-183** — Document purchase-order detail, edits and lifecycle transitions (`<id>/`, `submit|resolve|receive|cancel/`)
  - **Source**: INT-035 (M23), INT-022 (M18), INT-024 (M21) · inventory Domain 10, A.7
  - **Output**: `docs/api/domains/10-inventory-locations-procurement/m23-procurement.md`
  - **Must document**:
    - `<id>/` GET — lines, approval `{status, approver, approver_role}`, approver, timeline; PATCH draft only with optional `version`.
    - `submit/` (creates `po_approval` request), `resolve/` (decision needs `suppliers.approve`; self-approval 403 from `ApprovalRequest.resolve`), `receive/`, `cancel/` — all with `version`; stale → 409 «حُدِّث الأمر من مستخدم آخر.» + current version.
    - Rules changed in the shared service (legacy screens + M18 queue follow): reject → `draft` (spec §5; Django used to cancel); every transition bumps `version`; cancel allowed from any non-final status (FR-23.04) and closes a pending `po_approval` as rejected «أُلغي أمر الشراء.» (legacy cancel keeps its draft-only limit); receive checks the LOCKED row's status.
    - Receiving writes `StockMovement(po_received)` into `LocationInventory` or flat stock, with reference + actor.
    - Bug fixed: receiving a variant line in flat-stock mode left `Product.stock` stale (no `recalculate_stock_from_variants`).
    - Timeline FR-23.08: `AuditLog` `po.<kind>` events (created/updated/submitted/approved/rejected/received with quantities/cancelled) written by the shared service; legacy orders get a derived «created».
    - Migration `0230`: `PurchaseOrder.notes` / `version` / `updated_at` (backfilled from `created_at`).
  - **Done when**: a state diagram (draft → submitted → approved/rejected → received / cancelled) with the 409 contract is published.
  - **Status**: written in official Step 24 (2026-10-27): `m23-procurement.md#lifecycle` (detail object, draft edit, the `version`/`409` contract, Mermaid status machine, submit, resolve, the M18 queue door, receive with stock effects, cancel, timeline). Discrepancy: `submit/` takes `version` optionally.

- [x] **DOC-184** — Document M23 BFF wiring and tests
  - **Source**: INT-035 (M23) · A.3, A.12
  - **Output**: `docs/api/domains/10-inventory-locations-procurement/m23-procurement.md`
  - **Must document**:
    - Both BFF catch-alls → `liveOrMock(…, "procurement", "/api/v1/<resource>/<path>/")`; `.env.example` adds `procurement`; mock aligned (unique name, delete blocked by any order).
    - Tests: `api/test_procurement_api.py` (9) + the three legacy supplier suites (reject test updated) + staff/inventory/reports green.
  - **Done when**: the catch-all path template is documented.
  - **Status**: written in official Step 24 (2026-10-27): `m23-procurement.md#bff` (catch-all path template with an example table, live/mock behaviour, the 9 + 26 tests). Discrepancy: four legacy supplier suites, not three; the updated reject test keeps a name that says «cancels».

### 1.15 Domain 11 API — Shipping, couriers & Sharwa Ship (الشحن والمندوبون وشروة شيب)

M15 configures delivery (methods, pickup points, own-fleet providers, 3PL carriers, zones, packaging, restrictions, SLAs); M39 operates the platform's own carrier «شروة شيب» (waybills charged to the merchant's Sharwa Pay wallet, shipment state machine, AWB queue, rate cards, courier supervision); M38 is the courier's mobile app. All shipment status changes go through the single gate `apply_shipment_transition`; shifts and custody move with `transfer_shift` / `transfer_custody`. Platform-level Sharwa Ship zones are administered in the console (INT-031) and read here.

- [x] **DOC-185** — Document the M15 module overview, gates and shipping settings row (`shipping/settings/`)
  - **Source**: INT-021 (M15), INT-010 (M34) · inventory Domain 11
  - **Output**: `docs/api/domains/11-shipping/m15-shipping.md`
  - **Must document**:
    - Provider `products/services/shipping_service.py` + `api/views_shipping.py` — 25 routes; before: HTML screens only (`shipping_companies`, `shipping_providers`, `pickup_locations`, `carrier_settings`, `packaging_profiles`, `zone_review`, `update_address_in_transit`, `convert_order_to_pickup`).
    - Full 25-route table: `shipping/settings/`, `shipping/delivery-methods/` · `<pk>/`, `shipping/pickup-locations/` · `<pk>/` · `reorder/`, `shipping/providers/` · `<pk>/` · `staff-options/`, `shipping/carriers/` · `<code>/` · `credentials/` · `test/`, `shipping/sharwa-ship/zones/`, `shipping/packaging-profiles/` · `<pk>/`, `shipping/zone-review/` · `<order_id>/resolve/`, `shipping/restricted-zones/` · `<pk>/`, `shipping/sla-rules/` · `<pk>/`, `shipping/edge-cases/`, `shipments/<pk>/address/`, `orders/<pk>/convert-to-pickup/`.
    - `shipping/settings/` = the M34 row via `settings_service.patch_shipping`; owner only (staff 403 «إعدادات الشحن مقصورة على مالك المتجر.»).
    - Plan features (legacy `require_feature`): `shipping_settings`, `shipping_companies` (methods), `pickuplocation`, `shipping_providers`; edge cases `orders.view`; address/convert `orders.update_status`.
    - Free-shipping threshold compared in the dashboard currency (INT-013).
  - **Done when**: the 25-route table with method/gate/plan feature per row is complete.
  - **Status**: written in official Step 25 (2026-10-27): `m15-shipping.md#overview`, `#access`, `#summary`, `#settings` (the 8 legacy screens, the 25-route table with method / Django path / BFF path / gate / plan feature, the three-step gate chain, the M34 settings row with its INT-013 threshold rule). Discrepancy: the owner-only check runs **before** the plan feature (M22 is the other way round); the settings message «أدخل مبلغاً صحيحاً (مثال: 1500.00)» has no full stop.

- [x] **DOC-186** — Document delivery methods incl. the official «شروة شيب» method (`shipping/delivery-methods/`)
  - **Source**: INT-021 (M15) · inventory Domain 11
  - **Output**: `docs/api/domains/11-shipping/m15-shipping.md`
  - **Must document**:
    - CRUD; the official «شروة شيب» method is editable for price / time / active only — name fixed, DELETE 403, a disabled one leaves the merchant's list (`shipping_companies_view`); `delivery-methods.tsx` opens it with a read-only name, delete stays blocked.
    - Sharwa Ship hidden at checkout when the plan lacks `sharwa_ship` (INT-014).
  - **Done when**: the official-method restrictions are listed with their status codes.
  - **Status**: written in official Step 25 (2026-10-27): `m15-shipping.md#methods`, `#official-method` (CRUD, the official-method restrictions with status codes, checkout hiding for `sharwa_ship`). Observation: a disabled official method leaves the list and the API cannot bring it back (`404`) — derived from the code, not asserted by a test.

- [x] **DOC-187** — Document pickup locations (`shipping/pickup-locations/`, `<pk>/`, `reorder/`)
  - **Source**: INT-021 (M15), INT-025 (M22) · inventory Domain 11
  - **Output**: `docs/api/domains/11-shipping/m15-shipping.md`
  - **Must document**:
    - CRUD + reorder; the response includes the M22 `pickup_point_locations` hint; plan feature `pickuplocation`.
    - Pickup at checkout ⇒ zero delivery fee + `Order.pickup_location` (INT-014); pickup code issuance (`ensure_pickup_code`, INT-015) and open item: verifying the code at the counter is not built (A.13).
  - **Done when**: reorder semantics and the M22 hint field are documented.
  - **Status**: written in official Step 25 (2026-10-27): `m15-shipping.md#pickups` (CRUD, full-set reorder semantics, the M22 `pickup_point_locations` hint, zero delivery fee at checkout, `ensure_pickup_code`, open item A.13). Only the shape of the hint is documented — the test does not assert its content.

- [x] **DOC-188** — Document own-fleet providers (`shipping/providers/`, `<pk>/`, `staff-options/`)
  - **Source**: INT-021 (M15) · inventory Domain 11
  - **Output**: `docs/api/domains/11-shipping/m15-shipping.md`
  - **Must document**:
    - A provider with past orders → 409 (disable instead).
    - `staff_account` is OneToOne (one staff ↔ one agent), never a terminated staff member, never on a carrier company; `staff-options/` lists eligible staff.
    - Provider limits nullable in the schema (legacy rows show «—»).
    - Plan feature `shipping_providers`.
  - **Done when**: the staff-linking rules and 409 case are documented.
  - **Status**: written in official Step 25 (2026-10-27): `m15-shipping.md#providers`, `#staff-link` (the four staff-link rules, the `409` on delete, the nullable limits). Discrepancy: `staff-options/` lists **all** staff members including terminated ones, not only «eligible» staff — eligibility is enforced on write.

- [x] **DOC-189** — Document 3PL carriers, credentials and connection test (`shipping/carriers/`, `<code>/`, `credentials/`, `test/`)
  - **Source**: INT-021 (M15) · inventory Domain 11
  - **Output**: `docs/api/domains/11-shipping/m15-shipping.md`
  - **Must document**:
    - `credential_fields` come from `CARRIER_REGISTRY` — aramex: username / password / account_number / account_pin; smsa: username / password (mock aligned); stored in `ThirdPartyLogisticsClientAgreement` (`merchant_own`).
    - No secret leaves the service (`value` only for non-secret fields; the platform's shared account is never exposed); an empty secret keeps the stored one; aramex `account_pin` is now a secret (SC-15.4).
    - `test/` = new `CarrierAdapter.test_connection()` — aramex: server reachability; smsa: not wired yet (open item A.13); a failure flips the carrier to `error` for 24 h.
    - Schema fields `credential_source` / `platform_enabled` (save disabled until the platform enables the carrier; notes on the carrier screen).
    - Bugs fixed: `resolve_carrier_credentials` and `carrier_settings_save_view` read `connection.schema_name` inside `schema_context('public')` → the merchant's own credentials were never found / were saved against the public tenant.
  - **Done when**: per-carrier field tables, secret-handling rules and the 24 h error state are documented.
  - **Status**: written in official Step 25 (2026-10-27): `m15-shipping.md#carriers`, `#carrier-state`, `#carrier-test` (per-carrier field tables, secret handling, the 24 h error state, the two schema-context bug fixes). Discrepancy: the `smsa` test always fails and `aramex` checks server reachability only (both documented as open items); `credentials/` and `test/` BFF files are too deep to stage.

- [x] **DOC-190** — Document Sharwa Ship zones (read) and packaging profiles
  - **Source**: INT-021 (M15), INT-031 (M45) · inventory Domain 11
  - **Output**: `docs/api/domains/11-shipping/m15-shipping.md`
  - **Must document**:
    - `shipping/sharwa-ship/zones/` — public `SharwaShipZone`, read-only for merchants (admin in the console, INT-031); zones without a centre are not drawn; live key `shipping` since INT-021.
    - `shipping/packaging-profiles/` · `<pk>/` — grams in the contract ⇄ Django `box_weight_kg`.
  - **Done when**: the grams ⇄ kg conversion is documented with an example.
  - **Status**: written in official Step 25 (2026-10-27): `m15-shipping.md#zones-packaging` (zones list read-only, packaging profiles, the grams ⇄ kg mapping with two worked examples).

- [x] **DOC-191** — Document zone review and restricted zones (`shipping/zone-review/`, `<order_id>/resolve/`, `shipping/restricted-zones/`)
  - **Source**: INT-021 (M15) · inventory Domain 11
  - **Output**: `docs/api/domains/11-shipping/m15-shipping.md`
  - **Must document**:
    - Polygons: contract `[[lat,lng]]` ⇄ Django `[{lat,lng}]` (what `point_in_polygon` reads); `RestrictedZonePolygon.reason` (migration `0222`).
    - Zone review list = open, unresolved, not-yet-picked-up delivery orders inside an active restricted polygon (`restricted_polygon`), or flagged by a deactivated zone / outside every active Sharwa Ship zone for an official-method order (`outside_zone`).
    - `Order.delivery_latitude/longitude` (checkout now stores the buyer's coordinates) + `zone_review_resolved_at`; review `latitude/longitude` nullable in the schema (listed, not drawn).
    - Resolve actions: `confirm` · `convert_pickup` (same path as `PATCH orders/<id>/`) · `cancel` = cancel the not-yet-picked-up waybills (fees waived), order kept.
  - **Done when**: both review reasons and the three resolve actions are documented with request bodies.
  - **Status**: written in official Step 25 (2026-10-27): `m15-shipping.md#zone-review`, `#review-reason` (Mermaid decision diagram of the two reasons, the polygon mapping, `reason`, the resolve checks and the three actions with request bodies). Not covered by a test: the `cancel` happy path.

- [x] **DOC-192** — Document SLA rules and the edge-cases feed (`shipping/sla-rules/`, `shipping/edge-cases/`)
  - **Source**: INT-021 (M15) · inventory Domain 11
  - **Output**: `docs/api/domains/11-shipping/m15-shipping.md`
  - **Must document**:
    - `DeliverySLARule` by zone and/or delivery method (`source_location` optional, new `delivery_method` FK — origin rules keep serving `resolve_delivery_sla`).
    - Edge cases = `ShipmentEvent` flags (`out_of_order` / `flagged_for_review` / `is_rejected`, readable notes from `rejection_reason` / geofence payload) + SLA breaches (open waybills past `created_at + sla_hours`; SLA lookup chain zone+method ⟵ zone ⟵ method ⟵ 72 h default); gate `orders.view`.
  - **Done when**: the SLA resolution chain is documented as an ordered list.
  - **Status**: written in official Step 25 (2026-10-27): `m15-shipping.md#sla-edge`, `#sla-chain` (SLA rule CRUD with limits and error keys, the ordered four-step resolution chain, the four edge-case kinds, row fields and every note sentence).

- [x] **DOC-193** — Document in-transit address update and convert-to-pickup (`shipments/<pk>/address/`, `orders/<pk>/convert-to-pickup/`)
  - **Source**: INT-021 (M15), INT-007 (M06) · inventory Domain 11, A.7
  - **Output**: `docs/api/domains/11-shipping/m15-shipping.md`
  - **Must document**:
    - Address update only while `in_transit`; writes a `merchant_manual` event + order timeline + bumps `version`; gate `orders.update_status`.
    - Convert-to-pickup uses the order `version` (409 `{detail, current_version, status}`), blocked from `picked_up` on; also cancels `label_pending` waybills (bug fixed — they stayed active).
  - **Done when**: both endpoints have request/response/409 examples.
  - **Status**: written in official Step 25 (2026-10-27): `m15-shipping.md#shipment-actions`, `#convert` (request / check order / response for both routes, the `409` body, the blocked-status sentences). Note: the roadmap names `label_pending` waybills; the code cancels `label_pending` **and** `pending_pickup` ones (inside `shipment_operations_service.convert_order_to_pickup`), and the `cancelled` block sentence is only shown in the feed, not enforced by the route.

- [x] **DOC-194** — Document M15 migrations, BFF wiring and tests
  - **Source**: INT-021 (M15) · A.3, A.9, A.12
  - **Output**: `docs/api/domains/11-shipping/m15-shipping.md`
  - **Must document**:
    - Migration `products/0222_shipping_api`: `Order.delivery_latitude/longitude` + `zone_review_resolved_at`; `RestrictedZonePolygon.reason`; `DeliverySLARule.delivery_method` (+ `source_location` optional).
    - The 25 M15 BFF rows → `liveOrMock(…, "shipping", …)`; `.env.example` adds `shipping`; frontend schema changes (nullable provider limits, nullable review coordinates, carrier `credential_source`/`platform_enabled`).
    - Out of scope here: Sharwa Ship ops (INT-046/INT-047).
    - Tests: `api/test_shipping_api.py` (9) plus carrier/zone/orders/checkout/settings/tracking suites re-run green.
  - **Done when**: the page has data-model, BFF and tests sections.
  - **Status**: written in official Step 25 (2026-10-27): `m15-shipping.md#schema-changes`, `#bff`, `#bff-table`, `#tests` (migration `0222`, the 25 BFF rows, the mock-vs-Django differences, the 9 tests mapped to sections). Discrepancy: 3 of the 25 BFF files (`credentials`, `test`, zone-review `resolve`) are nested too deep to stage and are documented from Django and the client hooks; `.env.example:79` already lists `shipping`.

- [x] **DOC-195** — Document the courier-app identity model and `agent/me/`
  - **Source**: INT-046 (M38) · inventory Domain 11, A.4
  - **Output**: `docs/api/domains/11-shipping/m38-courier-app.md`
  - **Must document**:
    - Provider `products/services/courier_app_service.py` + `api/views_courier.py`; actions in `api/views.py`; before: Django had `ShipmentOrder` + `ShipmentEvent`, `CourierShift`, `CourierCustodyLedger` (`get_courier_balance`) and HTML only.
    - Identity = a staff session whose `shipping_provider_profile` is the agent; no session 401; owner 403 «هذا التطبيق لحسابات المندوبين…»; staff without a provider profile 403; inactive profile 403 (`_resolve_agent`).
    - `agent/me/` → `{agent:{id,name}, open_shift, display_balance, currency}`; a multi-currency ledger shows one total per currency.
  - **Done when**: each 401/403 case has its exact message and the `me` payload is documented.
  - **Status**: written in official Step 26 (2026-10-27): `m38-courier-app.md#overview`, `#access`, `#me` (the identity model, every 401/403 case with its exact message, the `agent/me/` payload and the one-total-per-currency balance). No discrepancy.

- [x] **DOC-196** — Document courier reads: shipments, shipment detail and custody ledger
  - **Source**: INT-046 (M38) · inventory Domain 11
  - **Output**: `docs/api/domains/11-shipping/m38-courier-app.md`
  - **Must document**:
    - `agent/shipments/?status` → `{count, counts (4 tabs + other), results}` = shipments whose `Fulfillment.shipping_provider` is the agent (what `transfer_shift` moves on handover); `display_cod_amount` = fulfillment lines × price in the order's currency (what `finalize_partial_delivery` records).
    - `agent/shipments/<id>/` — items with delivered quantity/reason, `allowed_transitions` from `ALLOWED_TRANSITIONS`, events newest first with actor name; 404 for another agent's shipment.
    - `agent/custody/?page` — 50/page, `sign` from the entry type, linked waybill.
    - BFF: `api/bff/agent/[...path]` → `liveOrMock(…, "courier", "/api/v1/agent/<path>/", …)` (4 reads; non-GET → 405 in mock); `.env.example` lists `courier`.
  - **Done when**: tab counters and COD amount derivation are documented.
  - **Status**: written in official Step 26 (2026-10-27): `m38-courier-app.md#shipments`, `#shipment-detail`, `#custody`, `#bff-reads` (the four tab counters plus `other`, the COD amount derivation, the 50/page custody ledger and its `sign`, the four BFF reads). No discrepancy.

- [x] **DOC-197** — Document the five courier actions and their contract/security fixes
  - **Source**: INT-046 (M38), A.11 · inventory Domain 11
  - **Output**: `docs/api/domains/11-shipping/m38-courier-app.md`
  - **Must document**:
    - Routes (Ready rows via the `/api/v1/*` passthrough, no switch; POSTs reach Django with a body only since the `upstream.ts` buffering fix): `agent/shifts/start/`, `agent/shifts/end-and-handover/`, `agent/shipments/<id>/status/`, `agent/fulfillments/<id>/scan-pickup/`, `agent/fulfillments/<id>/partial-delivery/` (confirm exact prefixes from `api/urls.py`).
    - Contract fixes: start → `agent: {id, name}` + `closed_previous_shift_id`; handover → `handed_over_to: {id, name}`; partial delivery → `display_collected_amount`, `status`, numbers (not null) on a duplicate (`format_money`).
    - Security gaps closed: an agent could end/hand over ANY shift, move ANY shipment, scan or deliver ANY fulfillment — now only his own (404 otherwise, `_agent_owns`); owner keeps acting for any agent via `agent_id`; a closed shift cannot be ended again; handover to oneself or to an inactive agent refused; inactive agent profile cannot act.
    - Status moves go through `apply_shipment_transition`; handover through `transfer_shift`.
    - No migration; related fix `products/test_cod_collection.py` now expects `'10.00'`; tests `api/test_courier_api.py` (6).
  - **Done when**: every action has request/response and its ownership rule documented.
  - **Status**: written in official Step 26 (2026-10-27): `m38-courier-app.md#actions`, `#shift-start`, `#shift-end`, `#status`, `#scan`, `#partial`, `#ownership`, `#fixes` (the five routes with request/response, the ownership matrix, the contract and security fixes). Discrepancies: the roadmap says `api/test_courier_api.py` (6) but the file has 5 test methods (the 6 belongs to `products/test_cod_collection.py`); the status view can return `geo_required`, a fifth rejection reason that the Zod contract does not list.

- [x] **DOC-198** — Document Sharwa Ship pending orders and waybill issuance
  - **Source**: INT-047 (M39), INT-048 (M40) · inventory Domain 11
  - **Output**: `docs/api/domains/11-shipping/m39-sharwa-ship.md`
  - **Must document**:
    - Provider `products/services/sharwa_ship_api_service.py` + `api/views_sharwa_ship.py` — 12 routes under `/api/v1/shipping/`; before: all `[NEEDS BACKEND]` except zones (live on `shipping` since INT-021); Django already had `issue_waybill`, `ShipmentOrder`/`ShipmentEvent`, `PendingAWBQueue`, `CarrierRateCardSnapshot`, shifts/custody, HTML only.
    - `sharwa-ship/pending-orders/` — orders without a waybill in a pending status (new / awaiting_payment / payment_review / pending_payment), newest 50, weight preview + expected AWB count from `calculate_chargeable_weight` / `split_fulfillment_into_awbs`.
    - `sharwa-ship/orders/<id>/waybill/` `{zone_code}` → 201 the detail; `WaybillError` / weight / hazard → 400 `{detail}`; Django SPLITS a heavy fulfillment into a master + children (the mock refused it); `issue_waybill` = Sharwa Pay charge atomic with the AWB + weight, split, hazard and marketplace guards + `WaybillRegistry`.
    - Issuing a real waybill debits the fee from the store's Sharwa Pay wallet.
    - Mapping: `zone_code` derived from the snapshotted zone name (no stored code on the waybill).
  - **Done when**: the split behaviour and the wallet debit are called out with examples.
  - **Status**: written in official Step 26 (2026-10-27): `m39-sharwa-ship.md#overview`, `#pending`, `#issue` (pending-orders list, `waybill/` request/response/errors with every `WaybillError` sentence, the split into master + children with a worked 5 kg example, the Sharwa Pay debit per waybill, `zone_code` derived from the snapshotted name). Observations (not roadmap differences): the route issues only the order's first sub-shipment; the preview ignores the zone's volumetric divisor, so preview and issued weights can differ.

- [x] **DOC-199** — Document Sharwa Ship shipments: list, detail, manual status and assignment
  - **Source**: INT-047 (M39) · inventory Domain 11, A.7
  - **Output**: `docs/api/domains/11-shipping/m39-sharwa-ship.md`
  - **Must document**:
    - `shipments/` — masters only; filters `status · billing_status · carrier · q · from · to`; counts.
    - `shipments/<id>/` — children, items + unit prices, COD, events newest first with actor name and geo, allowed transitions; `version` = accepted transitions + 1 (no version column).
    - `shipments/<id>/status/` — `merchant_manual` through the single transition gate; 200 with `accepted:false` + reason on a refused move.
    - `shipments/<id>/assign/` `{agent_id}` — `transfer_custody` on the fulfillment.
  - **Done when**: the `accepted:false` refusal shape and the derived `version` are documented.
  - **Status**: written in official Step 26 (2026-10-27): `m39-sharwa-ship.md#shipments`, `#shipments-list`, `#shipment-detail`, `#manual-status`, `#assign` (filters and counters, the detail with events, the refused-move `accepted:false` shape, `version` = accepted transitions + 1, `transfer_custody`). Observation: `assign` does not run the marketplace/supplier fulfilment guard that `issue_waybill` applies.

- [x] **DOC-200** — Document the AWB failure queue and rate cards
  - **Source**: INT-047 (M39) · inventory Domain 11, A.8
  - **Output**: `docs/api/domains/11-shipping/m39-sharwa-ship.md`
  - **Must document**:
    - `awb-queue/` (failed only) + `<id>/retry/` — 409 unless failed; queues Celery `retry_pending_awb_issuance_for_tenant` on commit.
    - `rate-cards/` — drift vs the last confirmed price; never confirmed = awaiting.
  - **Done when**: retry semantics and the Celery task name are documented.
  - **Status**: written in official Step 26 (2026-10-27): `m39-sharwa-ship.md#awb`, `#retry`, `#rate-cards` (queue item shape, the 409 rule, the Celery task `retry_pending_awb_issuance_for_tenant` and its 15-minute Beat fallback, rate-card drift). Discrepancy: the roadmap says `awb-queue/` is "failed only"; the code lists all four statuses (`pending`, `processing`, `issued`, `failed`) and only the retry is limited to `failed`. Observation: the task retries every pending item of the tenant, not only the chosen one.

- [x] **DOC-201** — Document courier supervision, emergency reassignment and agent shifts
  - **Source**: INT-047 (M39), INT-046 (M38) · inventory Domain 11
  - **Output**: `docs/api/domains/11-shipping/m39-sharwa-ship.md`
  - **Must document**:
    - `supervisor/` — agents = providers without a carrier code: open shift, active fulfillments, balance; Sharwa Ship waybills without an agent; last 100 COD reversals.
    - `agents/<id>/emergency-reassign/` `{new_agent_id}` — `transfer_shift` moves fulfillments + custody → `{detail, moved_shipments, display_balance_moved}`.
    - `agent-shifts/`.
    - Supervision also opens with `shipping_providers` (Phase 7 decision 3 — stores with their own local couriers).
  - **Done when**: payloads and the dual feature gate are documented.
  - **Status**: written in official Step 26 (2026-10-27): `m39-sharwa-ship.md#supervisor`, `#reassign`, `#shifts` (agents board, unassigned orders, the last 100 reversals, the `transfer_shift` emergency move with the «طوارئ» shift, the 200-row shift log, the dual feature gate). No discrepancy.

- [x] **DOC-202** — Document M39 gates, messages, BFF wiring and tests
  - **Source**: INT-047 (M39) · A.3, A.5, A.12
  - **Output**: `docs/api/domains/11-shipping/m39-sharwa-ship.md`
  - **Must document**:
    - Gates = the mock router: feature `sharwa_ship` (supervision rows also with `shipping_providers`); reads `orders.view`; writes + supervision owner-only.
    - Messages verbatim: «ميزة شروة شيب غير مفعّلة لمتجرك.», «الإشراف على المندوبين يتطلب «شروة شيب» أو التوصيل المحلي.», «ليست لديك صلاحية لعرض الشحنات.», «هذا الإجراء مقصور على مالك المتجر.».
    - BFF: seven `/api/bff/shipping/{sharwa-ship,shipments,awb-queue,rate-cards,supervisor,agents,agent-shifts}` adapters → `liveOrMock(…, "sharwa_ship", "/api/v1/shipping/<path>/", …)`; `.env.example` lists `sharwa_ship`. No migration.
    - Tests: `api/test_sharwa_ship_api.py` (7).
  - **Done when**: a gate matrix (route × feature × permission × owner) is published.
  - **Status**: written in official Step 26 (2026-10-27): `m39-sharwa-ship.md#access` (12-route gate matrix: route × feature × permission × owner), `#messages` (the four sentences verbatim), `#bff` (the seven adapters), `#mock-diffs`, `#tests`. Discrepancy: the roadmap says `api/test_sharwa_ship_api.py` (7) but the file has 6 test methods; `issue_waybill` is patched in the issue test, so the wallet debit and the split are not covered by it.

### 1.16 Domain 12 API — Store settings, staff & permissions, domains & integrations (الإعدادات والفريق والصلاحيات والتكاملات)

Settings are the single row other modules reuse (`patch_shipping` by M15, `patch_announcement` by M08, `patch_payments` by M14, `set_multi_location` by M22); M18 is the authority for every permission key, the approvals queue (write-offs, POs, B2B, POS shortages/discounts) and staff identity; M19 owns custom domains (public `CustomDomain` → `tenants.Domain`), tracking pixels (also served by `/config/`) and outgoing webhooks.

- [x] **DOC-203** — Document the full store-settings read (`GET /api/v1/settings/`)
  - **Source**: INT-010 (M34) · inventory Domain 12
  - **Output**: `docs/api/domains/12-settings-staff-integrations/m34-store-settings.md`
  - **Must document**:
    - Provider `products/services/settings_service.py` + `api/views_settings.py`; before: seven HTML forms + two toggle views.
    - Response = the whole row = `settingsSchema`, never `admin_password`; `display_*` in YER_NEW; `fx_preview` for 100 SAR; `store_url` from the tenant's primary domain; `pending_payment_orders`.
  - **Done when**: every top-level field of `settingsSchema` is listed with type and source.
  - **Status**: written in official Step 27 (2026-10-27): `m34-store-settings.md#read` (the 40 top-level fields of `settingsSchema` with type and source, `fx_preview`, `store_url`, `pending_payment_orders`, never `admin_password`). Discrepancy: the roadmap says `display_*` is in YER_NEW; only `display_default_delivery_fee` is, while `display_free_shipping_threshold` uses the store's dashboard currency.

- [x] **DOC-204** — Document the eight settings section PATCHes (`settings/<identity|contact|policies|shipping|currency|seo|announcement|payments>/`)
  - **Source**: INT-010 (M34), INT-018, INT-020, INT-021 · inventory Domain 12
  - **Output**: `docs/api/domains/12-settings-staff-integrations/m34-store-settings.md`
  - **Must document**:
    - Each write returns the full row; field errors `{field:[msg]}` with the mock's messages.
    - Plan feature per section (legacy `require_feature`): `contact_info`, `store_policies`, `shipping_settings`, `currency_settings`, `seo_settings`, `coupon` (announcement), `multi_location`.
    - Owner-only money/structure sections; text sections for owner or `catalog.manage`.
    - Payments: «at least one payment method» guard (manual + Sharwa Pay + gateways), shared with M14 (`patch_payments`).
    - SEO image: `Base64ImageField` (data URL in, absolute URL out, existing URL = unchanged, null = remove); `DATA_UPLOAD_MAX_MEMORY_SIZE` 8 MB.
    - Announcement: an enabled bar needs text (checked on the merged row); shared with M08 via `patch_announcement`.
    - Currency: FX rates 4 decimals (migration `0217_storesetting_fx_rate_precision`; e.g. `3.7525`).
    - Shipping section reused by M15 (`patch_shipping`).
  - **Done when**: one sub-section per PATCH with fields, gate and validations exists.
  - **Status**: written in official Step 27 (2026-10-27): `m34-store-settings.md#sections`, `#identity`, `#contact`, `#policies`, `#shipping`, `#currency`, `#seo`, `#announcement`, `#payments` (one sub-section per PATCH with fields, gate, validations and verbatim messages, the gate matrix in `#access`). Discrepancy: the roadmap gives 8 MB as the SEO image limit; two limits apply, the decoded image at most 5 MB and the request body at most 8 MB.

- [x] **DOC-205** — Document the multi-location switch (`POST settings/multi-location/`)
  - **Source**: INT-010 (M34), INT-025 (M22) · inventory Domain 12
  - **Output**: `docs/api/domains/12-settings-staff-integrations/m34-store-settings.md`
  - **Must document**:
    - Turning multi-location off with stock in > 1 location → readable 409 `{detail, conflicts}` unless `merge: true` (Product.stock already mirrors the location sum, so nothing moves); mock 409 text matches Django; same service `set_multi_location` used by `locations/mode/`.
  - **Done when**: the 409 body and `merge` semantics are documented.
  - **Status**: written in official Step 27 (2026-10-27): `m34-store-settings.md#multi-location` (the `409 {detail, conflicts}` body, `merge: true` semantics, the shared `set_multi_location` service). Observations: the 409 needs at least two locations holding stock; the owner check runs before the plan feature here and after it in M22 `locations/mode/`.

- [x] **DOC-206** — Document the `/api/v1/config/` extensions served by `StoreConfigSerializer`
  - **Source**: INT-010 (M34), INT-002, INT-019, INT-023 · inventory Domain 12
  - **Output**: `docs/api/domains/12-settings-staff-integrations/m34-store-settings.md`
  - **Must document**:
    - Extensions handed over by INT-002 now served: card border, announcement colours/speed/page flags, free-shipping threshold, currency, SEO (+ absolute OG image), contact links, about/return policy, timezone, week start; gifting/loyalty (INT-019); `tracking` public ids (INT-023).
    - BFF: `settings` + 9 section rows → `liveOrMock(…, "settings", …)` via `settingsWrite(upstream, …)`.
    - Tests: `api/test_settings_api.py`.
  - **Done when**: the `/config/` field list marks which task owns each field.
  - **Status**: written in official Step 27 (2026-10-27): `m34-store-settings.md#config`, `#bff`, `#tests` (the `/config/` field list with the owning INT task per field, the ten BFF rows, the 11 tests). Discrepancy: the roadmap lists gifting/loyalty (INT-019) among the served extensions; `StoreConfigSerializer` and `StoreConfigView` emit neither `gifting_enabled` nor `loyalty_enabled`.

- [x] **DOC-207** — Document staff CRUD, counters, termination and temporary passwords
  - **Source**: INT-022 (M18), INT-003 · inventory Domain 12
  - **Output**: `docs/api/domains/12-settings-staff-integrations/m18-staff-permissions.md`
  - **Must document**:
    - Provider `products/services/staff_service.py` + `api/views_staff.py` — 26 routes; before: HTML screens (`staff_list_view`, `roles_list_view`, `staff_detail_view` + end sessions, `approval_requests_view` / `resolve_approval_view`, `audit_log_view` / `verify_audit_chain_view`, `behavior_alerts_view`).
    - Routes `staff/` · `counters/` · `<pk>/` · `terminate/` · `revoke-sessions/` · `reset-password/`.
    - Staff = phone + `auth.User` (username = phone, `customer_key` normalisation so 077…/77…/96777… is one number; duplicates checked across forms).
    - Create returns a `temporary_password` ONCE; `reset-password/` («كلمة مرور مؤقتة جديدة») issues another and ends every session (gap 1 — staff log in with phone + PASSWORD via `auth/staff/login/`, the old form's «رمز تحقق» text was wrong; `PasswordOnceDialog`).
    - Termination soft: `terminated_at`, `is_active=False`, `token_version+1`, sessions + tokens revoked, audited `staff.terminate`; never terminate yourself.
    - Gates: plan feature `staff_rbac` then `staff.view` · `staff.manage`.
  - **Done when**: the one-time password flow is documented with a warning that it is never retrievable again.
  - **Status**: written in official Step 27 (2026-10-27): `m18-staff-permissions.md#staff`, `#staff-list`, `#temp-password`, `#staff-patch`, `#terminate`, `#revoke`, `#counters` (CRUD, counters, soft termination, the one-time temporary password with the never-retrievable warning, the gate chain `staff_rbac` then `staff.view`/`staff.manage`). Discrepancies: terminating yourself answers `400` «لا يمكنك إنهاء خدمتك بنفسك.», not `403`, and `revoke-sessions`/`reset-password` have no self guard; the `temporary_password()` docstring says 10 characters with two digits, the code makes 9 characters (6 letters, 3 digits) plus a hyphen.

- [x] **DOC-208** — Document assignments, overrides and effective permissions
  - **Source**: INT-022 (M18) · inventory Domain 12, A.5
  - **Output**: `docs/api/domains/12-settings-staff-integrations/m18-staff-permissions.md`
  - **Must document**:
    - `staff/<pk>/assignments/`, `overrides/` (+`<oid>/`), `effective-permissions/`.
    - Effective permissions = the `permission_resolver` order (active location roles ∪, then global + that location's overrides) — verified equal to `resolve_context()`.
    - A member can never edit their own assignments/overrides (403); `staff.manage_assignments`.
  - **Done when**: the resolver order is documented as an algorithm with an example.
  - **Status**: written in official Step 27 (2026-10-27): `m18-staff-permissions.md#assignments`, `#assignments-get`, `#overrides`, `#effective`, `#resolver` (with a Mermaid flow and a worked example), `#self-edit`. Discrepancy: the roadmap says `effective-permissions/` is verified equal to `resolve_context()`; it is equal only without `?location_id=` (with it the route keeps only that location's roles and does not refuse an unassigned location, while `resolve_context` raises `PermissionDenied`). Observation: the overrides API only creates global overrides.

- [x] **DOC-209** — Document sessions, personal access tokens, trusted devices and roster
  - **Source**: INT-022 (M18), INT-003 · inventory Domain 12
  - **Output**: `docs/api/domains/12-settings-staff-integrations/m18-staff-permissions.md`
  - **Must document**:
    - `sessions/` (+`<sid>/`), `tokens/` (+`<tid>/`), `devices/` (+`<did>/`), `roster/`; permission `staff.view_sessions`.
    - `StaffSession.device_label` («Chrome · Android», filled at both logins).
    - `PersonalAccessToken.name/last_used_at`; raw `shw_pat_…` returned once, SHA-256 stored, 90-day expiry.
    - `TrustedDevice.staff/last_seen_at`; removal = deactivate.
    - `RosterSchedule.location` nullable (dashboard grid is store-wide); gap 2: `enforce_roster_schedule` now enforced — `auth/staff/login/` refuses a login outside the weekly roster (store timezone, 0 = Sunday; no roster rows = no restriction).
  - **Done when**: token format/hashing/expiry and the roster login refusal are documented.
  - **Status**: written in official Step 27 (2026-10-27): `m18-staff-permissions.md#sessions`, `#tokens`, `#devices`, `#roster` (sessions with `device_label`, `shw_pat_…` returned once with SHA-256 and 90-day expiry, trusted devices, the roster schedule and its login refusal). Discrepancies: nothing writes `PersonalAccessToken.last_used_at` and no authentication class or middleware accepts a `shw_pat_` bearer (consistent with DOC-024), so keys can be created and revoked but are not usable yet; nothing writes `TrustedDevice.last_seen_at`.

- [x] **DOC-210** — Document the permissions catalogue and roles (`permissions/`, `roles/`, `roles/<pk>/`)
  - **Source**: INT-022 (M18), INT-043 · inventory Domain 12, A.5
  - **Output**: `docs/api/domains/12-settings-staff-integrations/m18-staff-permissions.md`
  - **Must document**:
    - Permission categories seeded in English (`orders`, `staff`…) served in Arabic; full key list from A.5 incl. `expenses.manage` (category «المالية», INT-043).
    - System roles read-only (FR-18.04; the legacy screen let the owner edit them); `staff.manage_roles`.
    - Delete a role assigned to staff → 403 + the staff list; a role used as an approver role → 409 (PROTECT).
    - `Role.max_discount_percent` (POS ceiling, INT-033).
  - **Done when**: the catalogue table (key, Arabic category, default roles) is complete.
  - **Status**: written in official Step 27 (2026-10-27): `m18-staff-permissions.md#catalogue`, `#roles` (the 36-key permission catalogue with Arabic category and default roles, system roles read-only, the delete 403 with the staff list, the approver-role 409, `max_discount_percent`). No discrepancy.

- [x] **DOC-211** — Document the approvals queue (`approvals/`, `approvals/<pk>/resolve/`)
  - **Source**: INT-022 (M18), INT-024, INT-033, INT-035, INT-044 · inventory Domain 12, A.7
  - **Output**: `docs/api/domains/12-settings-staff-integrations/m18-staff-permissions.md`
  - **Must document**:
    - `ApprovalRequest.resolve()` (optimistic lock → 409, self-approval → 403); POs via `resolve_purchase_order`, B2B via `resolve_order_approval` (the legacy HTML resolve skipped B2B), shifts via `settle_shift_for_approval`, write-offs via `apply_writeoff`.
    - A staff decider must hold the request's `approver_role` at its location, or `staff.manage`.
    - Mapping: no snapshot → `payload` / `summary` / `entity` derived from `target_ref` + `amount` (order, PO, shift, product; `available=false` when gone/cancelled); owner actions show «مالك المتجر»; write-offs show quantity/note; POS discounts render e.g. «خصم 15% في نقطة البيع يتجاوز حد الدور (10%)».
    - Approval types added later: write-offs (INT-024), POS shortages and discount exceptions (INT-033), purchase orders (INT-035), B2B (INT-044).
  - **Done when**: a table of approval types → target entity → resolver function exists.
  - **Status**: written in official Step 27 (2026-10-27): `m18-staff-permissions.md#approvals`, `#approvals-list`, `#approvals-resolve` (approval type → target entity → resolver table, optimistic lock 409, self-approval 403, approver-role rule, the summary mapping with the verbatim POS discount sentence, a Mermaid sequence). Discrepancies: `refund` has no creator and `refund`/`discount_exception` approvals only change status, and `escalated_at` is exposed but never set; the mock lets a non-owner decide only with `staff.manage` and writes audit code `approval.resolved`, Django also accepts the approver-role holder and writes `approval.resolve`.

- [x] **DOC-212** — Document the audit log, chain verification and behavior alerts
  - **Source**: INT-022 (M18) · inventory Domain 12
  - **Output**: `docs/api/domains/12-settings-staff-integrations/m18-staff-permissions.md`
  - **Must document**:
    - `audit-log/` · `verify/` — `AuditLog` read-only + `verify_chain()` (`broken_at` = row number in insert order); gate `staff.view_sessions` OR `reports.sales.view` (the legacy `audit_log_view` key).
    - `behavior-alerts/` · `<pk>/read/` — `BehaviorAlert.value/limit` written by `behavior_service` (legacy rows parsed from `detail`); alerts whose member row is gone return `staff_id: null` (schema nullable, actions hidden).
  - **Done when**: `broken_at` semantics and nullable `staff_id` are documented.
  - **Status**: written in official Step 27 (2026-10-27): `m18-staff-permissions.md#audit`, `#audit-list`, `#audit-verify`, `#audit-codes`, `#alerts` (read-only log, `verify_chain` with `broken_at` as the row number in insert order, the dual gate, behaviour alerts with nullable `staff_id`). Observation: the `actor` filter matches any fragment of «مالك المتجر» as the owner. No discrepancy.

- [x] **DOC-213** — Document M18 migrations, open items, BFF wiring and tests
  - **Source**: INT-022 (M18) · A.3, A.9, A.12, A.13
  - **Output**: `docs/api/domains/12-settings-staff-integrations/m18-staff-permissions.md`
  - **Must document**:
    - Migration `products/0223_staff_api` (fields above).
    - Not built: IP allow-list addresses for `enforce_ip_whitelist` (no Django model; toggle + warning unchanged).
    - BFF: the 25 M18 rows + the new reset-password row → `liveOrMock(…, "staff", …)`; `.env.example` adds `staff`.
    - Tests: `api/test_staff_api.py` (9) + auth/notifications/dashboard/customers/orders/suppliers/staff legacy suites (101).
  - **Done when**: the full 26-route table with gates is published.
  - **Status**: written in official Step 27 (2026-10-27): `m18-staff-permissions.md#routes` (the 26-route table with gates), `#wiring` (BFF wiring, mock-vs-Django differences and the tests), `#migrations`, `#open-items` (migration `0223`, the not-built IP allow-list, the BFF mock-vs-Django differences, the 9 tests). The 26 routes and the 9 tests match the roadmap; the roadmap's "+ 101 legacy tests" were not recounted (those suites were not read).

- [x] **DOC-214** — Document custom domains: claim, DNS records, verification and primary switch
  - **Source**: INT-023 (M19) · inventory Domain 12, A.10
  - **Output**: `docs/api/domains/12-settings-staff-integrations/m19-domains-integrations.md`
  - **Must document**:
    - Provider `api/views_integrations.py` (13 routes, owner-only FR-19.09 — staff 403 `<what> مقصورة على مالك المتجر.`) over `products/services/domain_service.py` + public `tenants.CustomDomain` (migration `tenants/0026_customdomain`); the claim lives apart from `tenants.Domain` so nobody can squat a hostname before proving it.
    - `GET domains/` = subdomain row `id 0` (read-only, primary when no custom domain is) + claims.
    - `POST` — validated with the frontend `domainFormatError` text; refuses duplicates / another store's domain / > 5.
    - Records: CNAME (sub) or A (apex) to `SHARWA_EDGE_CNAME` / `SHARWA_EDGE_IP` + TXT `_sharwa.<host>`.
    - `verify/` — TXT + routing via dnspython (503 if unavailable) → `failed` with a reason, or creates the `tenants.Domain` row → `verifying` → `active` once HTTPS answers (TLS issuance is the ops step in `deploy/README`).
    - `set-primary/` — only `active` (0 = back to the subdomain); mirrors `StoreSetting.custom_domain` for legacy consumers.
    - DELETE refuses the subdomain and the primary.
  - **Done when**: a state diagram (pending → failed | verifying → active) and the DNS record table are published.
  - **Status**: written in official Step 27 (2026-10-27): `m19-domains-integrations.md#domains`, `#domains-list`, `#domains-add`, `#domains-records`, `#domains-verify`, `#domains-state` (Mermaid pending → failed | verifying → active), `#domains-primary`, `#domains-delete` (subdomain row id 0, the DNS record table, dnspython 503, the delete refusals). Discrepancy: the roadmap says all 13 routes are owner-only; 12 are, `integrations/status/` is open to owner and staff.

- [x] **DOC-215** — Document tracking pixels settings, `/config/` tracking and the storefront injection
  - **Source**: INT-023 (M19), INT-002 · inventory Domain 12
  - **Output**: `docs/api/domains/12-settings-staff-integrations/m19-domains-integrations.md`
  - **Must document**:
    - `GET|PATCH store/tracking/` (`integrations_service.py`) behind plan feature `tracking_tools`; CAPI tokens write-only (`has_*`; empty keeps, null clears, < 10 or > 255 refused); ids ≤ 50 / Ads label ≤ 100, no whitespace or `<>"'`; before: only `TrackingSettings` + HTML form + `_tracking_scripts.html` partial.
    - `/config/` `tracking` = public ids only (null when off or not in the plan); `store-config.tracking` nullable + Ads fields.
    - Storefront gap closed: `features/storefront/components/tracking-scripts.tsx` (same GTM/Meta/TikTok/Snap/gtag snippets as Django, ids JSON-escaped, page-view on client navigation, inert in the theme-preview frame) + Google Ads purchase conversion on `checkout/success/[public_uuid]` (once per order).
  - **Done when**: token write-only semantics and the list of injected pixels are documented.
  - **Status**: written in official Step 27 (2026-10-27): `m19-domains-integrations.md#tracking`, `#tracking-settings`, `#tracking-config`, `#tracking-storefront` (write-only CAPI tokens with `has_*`, empty keeps / null clears / < 10 or > 255 refused, id limits, the `/config/` public ids, the injected pixels and the Ads purchase conversion). Observations: the tokens are plain columns and nothing read sends server-side events; "once per order" is per browser session.

- [x] **DOC-216** — Document the webhook endpoint management API and delivery log
  - **Source**: INT-023 (M19) · inventory Domain 12
  - **Output**: `docs/api/domains/12-settings-staff-integrations/m19-domains-integrations.md`
  - **Must document**:
    - Endpoint CRUD, secret rotate, delivery log (status/event/date filters), redeliver (failed rows only = new attempt), synchronous test event — take exact paths from `api/urls.py` (part of the 13 M19 routes).
    - `WebhookEndpoint` / `WebhookDelivery` (migration `products/0224_webhooks`); re-enable resets the failure counter.
    - Cross-link to the integrator spec (section 1.17).
  - **Done when**: every management route is listed with method, body and response.
  - **Status**: written in official Step 27 (2026-10-27): `m19-domains-integrations.md#webhooks`, `#webhooks-events`, `#webhooks-endpoints`, `#webhooks-detail`, `#webhooks-secret`, `#webhooks-test`, `#webhooks-deliveries`, `#webhooks-redeliver`, `#webhooks-engine` (every management route with method, body and response, secret shown once, redeliver of failed rows, synchronous signed test event, the 10-failure auto-disable and re-enable reset). Observation: redeliver ignores the endpoint state. No discrepancy.

- [x] **DOC-217** — Document the integrations status overview (`GET integrations/status/`) and M19 wiring
  - **Source**: INT-023 (M19) · inventory Domain 12, A.3, A.10, A.12
  - **Output**: `docs/api/domains/12-settings-staff-integrations/m19-domains-integrations.md`
  - **Must document**:
    - 13 rows aggregated read-only from app installations, channel health, marketplace/supplier connections and carrier state; a staff member sees only the rows they hold the permission for; out-of-plan rows `available:false`.
    - BFF: 13 routes → `liveOrMock(…, "integrations", …)`; parity (tracking input limits = Django columns, mock subdomain id 0, mock tracking limits).
    - New deps/env: `dnspython`, `SHARWA_EDGE_IP`, `SHARWA_EDGE_CNAME`.
    - Tests: `api/test_integrations_api.py` (21).
  - **Done when**: the 13 status rows are listed with their source and permission.
  - **Status**: written in official Step 27 (2026-10-27): `m19-domains-integrations.md#status`, `#status-rows`, `#bff`, `#parity`, `#env`, `#tests` (the 13 status rows with source and permission, `available:false` for out-of-plan rows, the 13 BFF adapters and parity, `dnspython` / `SHARWA_EDGE_IP` / `SHARWA_EDGE_CNAME`, the 21 tests). The 21 tests match the roadmap. Observation: the two `SHARWA_EDGE_*` variables are not described in `deploy/README.md` or `.env.example`.

### 1.17 Integrator specs — outgoing and inbound webhooks

Integrator-facing reference for third parties receiving Sharwa events and for engineers maintaining the inbound receivers (INT-023 plus the receivers used by INT-030/031/037/039/040/041/048).

- [x] **DOC-218** — Write the outgoing-webhooks security and delivery spec
  - **Source**: INT-023 (M19) · inventory Domain 12, A.8
  - **Output**: `docs/api/integrators/webhooks-outgoing.md`
  - **Must document**:
    - https-only endpoints; SSRF guard — internal hosts and non-global IPs refused at save AND re-checked at send; no redirects followed.
    - Secret `whsec_…` stored encrypted, returned once (create/rotate).
    - Headers: `X-Sharwa-Signature: t=<ts>,v1=HMAC-SHA256(secret, "<ts>.<body>")`, `X-Sharwa-Event`, `X-Sharwa-Delivery`.
    - Delivery via Celery `deliver_webhook`: 3 automatic attempts (now, +60 s, +300 s); auto-disable after 10 consecutive failures; re-enable resets.
    - Redeliver = new attempt for failed rows only; synchronous test event; delivery log filters status/event/date.
    - Replay protection guidance (timestamp tolerance) and idempotency using `X-Sharwa-Delivery`.
  - **Done when**: an integrator can implement a compliant receiver from this page alone.
  - **Status**: written in official Step 28 (2026-10-27): `docs/api/integrators/webhooks-outgoing.md#overview`, `#quickstart`, `#url-rules`, `#secret`, `#request`, `#signature`, `#lifecycle` (Mermaid), `#retries`, `#auto-disable`, `#manual`, `#test-event`, `#idempotency`, `#replay`, `#limits` (https-only and the SSRF guard at save and at send, `whsec_` shown once, the three headers, 3 attempts at now / +60 s / +300 s, redeliver, replay and idempotency guidance). Discrepancies: `X-Sharwa-Delivery` is the id of the attempt row, so every retry and redelivery changes it; the stable dedupe key is the body `id` (`WebhookDelivery.event_id`); auto-disable counts failed attempts, not events, so four failing events (12 attempts) are enough, and test events and redeliveries count too.

- [x] **DOC-219** — Write the outgoing event catalogue with triggers and payload examples
  - **Source**: INT-023 (M19) · inventory Domain 12, A.8
  - **Output**: `docs/api/integrators/webhooks-events.md`
  - **Must document**:
    - `order.created` / `order.status_changed` — from `order_events`.
    - `order.fulfillment_changed` — from `Order.set_fulfillment_status`.
    - `order.refunded` — from `refund_service`.
    - `shipment.event` — accepted transitions only (`apply_shipment_transition`).
    - `product.updated` — product change log, stock-only changes excluded.
    - `inventory.low_stock` — Beat `dispatch-low-stock-webhooks` every 15 min, once per entry into the low range (stock moves via `F()` never hit `save()`).
    - A sample JSON payload per event (taken from `webhook_service.py`).
  - **Done when**: all 7 events have trigger, timing and sample payload.
  - **Status**: written in official Step 28 (2026-10-27): `docs/api/integrators/webhooks-events.md#envelope`, `#orders`, `#order-created`, `#order-status`, `#order-fulfillment`, `#order-refunded`, `#shipment`, `#product`, `#low-stock`, `#test`, `#handling` (all 7 events plus `webhook.test`, each with trigger, timing and a sample payload). Discrepancies: `order.status_changed` fires only for four source events, fewer than the dashboard text «عند نقل الطلب إلى حالة جديدة.» promises; `order.created` is emitted only by the storefront checkout and the cart checkout view, not by POS, B2B, phone or channel orders; `order.fulfillment_changed` comes only from `set_fulfillment_status` and shipping assignment fires `order.status_changed`; a fulfillment status that completes the order emits no delivered event; `product.updated` fires only on a full `save()` of an existing product for 17 tracked fields.

- [x] **DOC-220** — Provide signature-verification code samples (Node.js and Python)
  - **Source**: INT-023 (M19)
  - **Output**: `docs/api/integrators/webhooks-verify-samples.md`
  - **Must document**:
    - Parse `t=` and `v1=` from `X-Sharwa-Signature`; compute HMAC-SHA256 over `"<ts>.<raw body>"`; constant-time compare; reject stale timestamps.
    - Node (crypto, raw body with Express/Next) and Python (hmac, Flask/Django) snippets, tested against a fixture produced by the test event.
  - **Done when**: both samples verify a real test-event delivery.
  - **Status**: written in official Step 28 (2026-10-27): `docs/api/integrators/webhooks-verify-samples.md#algorithm`, `#node` (Express and a Next route handler), `#python` (Flask and Django), `#shell`, `#mistakes`, `#tested`. Both samples were run against a fixture generated with the real `sign()` extracted from `webhook_service.py` and cross-checked with `openssl` (Node 18/18 cases, Python 19/19). Discrepancy: the roadmap says both verify a real test-event delivery; no live delivery was possible in this step, so the fixture follows the documented algorithm and the `test_test_event_signed` recipe.

- [x] **DOC-221** — Document the inbound webhook receivers reference
  - **Source**: INT-021, INT-030, INT-031, INT-037, INT-039, INT-040, INT-041, INT-048 · inventory Domains 11, 13, 14, 16
  - **Output**: `docs/api/integrators/webhooks-inbound.md`
  - **Must document**:
    - Kuraimi bank webhook (Sharwa Pay top-ups): stores `bank_name` + `claimed_phone` (INT-031); `topup_auto` = a transaction id with NO receipt (INT-048 fix to `apply_credit_if_approved`, `credited_at` guard).
    - Carrier webhooks `CarrierWebhookView` → `process_carrier_webhook_event` with idempotency key `products.tasks.shipping.carrier_idempotency_key`; failures land in `PendingWebhookEvent` (console retry/discard, INT-030).
    - SharwaConnect (WhatsApp) `tenants/webhooks.py` routed by public session indexes.
    - Sharwa AI `tenants/webhooks_ai.py` `sharwa_ai_session_status_webhook` — shares `record_status` with the poll, records `ai_connected_at` / paired number (INT-041).
    - Meta / TikTok / Telegram channel webhooks → `process_inbound_channel_message`; Meta `object=page|instagram` sets `Conversation.source_platform`; public `ChannelSessionIndex` bridge (INT-037).
    - Dropshipping supplier webhooks `SupplierWebhookEvent`; `suppliers/<code>/webhook/rotate/` returns URL + signing secret once (`no-store`) (INT-039).
    - For each: URL pattern (from `urls_public`/`urls`), schema (public vs tenant), auth/signature, idempotency, Celery task triggered.
  - **Done when**: every receiver has URL, auth method and downstream task documented.
  - **Status**: written in official Step 28 (2026-10-27): `docs/api/integrators/webhooks-inbound.md#overview`, `#common`, `#bank` (the nine receivers as sections 3.1–3.9: Kuraimi bank, carriers, SharwaConnect, Sharwa AI, Meta, TikTok, Telegram, dropshipping suppliers and the supplier rotate route, each with URL, schema, auth, idempotency and downstream task), `#sink`, `#dlq`. Discrepancies: Sharwa AI has two receivers, not one; the Meta / TikTok / Telegram views never call `process_inbound_channel_message` (they queue their own tasks or send the `incoming_channel_message` signal); carrier failures reach `PendingWebhookEvent` only when the Celery task fails, and `on_failure` always writes `attempts = max_retries`; the `topup_auto` rule lives only in `apply_credit_if_approved`, the Kuraimi webhook credits directly.

### 1.18 Domain 13 API — Sales channels & operations: inbox, marketplaces, dropshipping, POS, bookings (القنوات والأسواق والدروبشيبينغ ونقطة البيع والحجوزات)

Every external channel already had its Django domain (encrypted `StoreAppInstallation` credentials + public bridge indexes, adapters, Celery jobs); the APIs expose them without a second engine — legacy HTML screens and new APIs call the same services. Orders created by channels (chat-to-order, marketplace orders, dropship forwarding, POS sales, booked services) are real M06 orders with their `sales_channel`. OAuth flows started from Next return with `?connected=<code>` or `?oauth_error=<reason>` and store a validated same-store `/dashboard/…` return URL (no open redirect).

- [x] **DOC-222** — Document the M27 gate chain and per-staff channel access
  - **Source**: INT-037 (M27) · inventory Domain 13, A.5
  - **Output**: `docs/api/domains/13-channels-operations/m27-inbox-channels.md`
  - **Must document**:
    - Provider `products/services/social_channels/{inbox_api_service,channels_api_service}.py` + `api/views_channels.py` — 21 routes; before: models `Conversation`, `Message`, `ConversationKeywordTrigger`, `ChannelCatalogSync` / `ChannelCategoryMapping` / `ChannelProductLink`, `StaffChannelAccess`, `ChannelOrderRoutingSettings`, the encrypted `StoreAppInstallation` + public `ChannelSessionIndex`, webhooks → `process_inbound_channel_message`, outbound `dispatch_channel_message`, HTML only.
    - Gates FR-27.01: session 401 → plan feature `social_channels` 403 → inbox for `channels.inbox.access` (owner always) → `StaffChannelAccess` inside the service (no rows = every channel; first row = whitelist; hidden conversation = 404; `can_reply` false = 403) → channel settings owner-only 403 «إعدادات القنوات لمالك المتجر فقط.», except the template list for every inbox member (`/` picker).
    - Secrets never returned (FR-27.08).
  - **Done when**: the gate chain is a numbered list with each status code and message.
  - **Status**: written in official Step 44 (2026-10-28): `docs/api/domains/13-channels-operations/m27-inbox-channels.md#2-access--gate-chain` — 6-gate table (session 401, plan feature, inbox membership, owner-only, StaffChannelAccess 404/403, disconnected 409), each with its verbatim message; whitelist rules and the template-list exception spelled out; FR-27.08 secrecy noted with its test. No discrepancies.

- [x] **DOC-223** — Document inbox counters, conversation list/detail and the product picker
  - **Source**: INT-037 (M27) · inventory Domain 13
  - **Output**: `docs/api/domains/13-channels-operations/m27-inbox-channels.md`
  - **Must document**:
    - `inbox/counters/`, `inbox/conversations/`, `inbox/conversations/<id>/`, `inbox/products/`.
    - Code mapping (one place): UI `meta · tiktok · telegram (+whatsapp)` ⇄ Django `meta_social_commerce · tiktok_shop · telegram_bot · whatsapp`; conversation channel `facebook|instagram` from `Conversation.source_platform` (Meta webhook `object=page|instagram`; legacy rows = facebook); unknown codes never listed; `whatsapp` added to the conversation channels (a WhatsApp conversation would have failed the list's Zod parse).
    - A new inbound message reopens a `resolved`/`pending` conversation (US-27.3.2 — Django never did).
  - **Done when**: the code-mapping table and reopen rule are documented.
  - **Status**: written in official Step 44 (2026-10-28): `m27-inbox-channels.md#41-counters-and-conversation-list--doc-223` (counters, filters, row example), `#42-conversation-detail-assignment-and-mark-read--doc-223`, `#43-product-picker--doc-223`; the UI ⇄ Django code-mapping table (facebook/instagram split via `source_platform`, whatsapp added) sits in §4.1; the reopen rule (resolved/pending → open on inbound) documented with its source line. No discrepancies.

- [x] **DOC-224** — Document messages: incremental read and replies (`…/messages?after`, reply POST)
  - **Source**: INT-037 (M27) · inventory Domain 13, A.7, A.8
  - **Output**: `docs/api/domains/13-channels-operations/m27-inbox-channels.md`
  - **Must document**:
    - `inbox/conversations/<id>/messages/?after=` incremental polling.
    - Reply saved at once as `Message(staff, status='queued')` → API `status: null` («جارٍ الإرسال»), dispatched on the channel's queue with the same `AppUsageLog`; `dispatch_channel_message(message_id=…)` updates THAT row (`sent` + external id, or `failed` + provider reason in `error_detail` — e.g. Meta's 24 h window, shown verbatim) instead of adding a «bot» row.
    - `client_id` unique (body or `Idempotency-Key`) ⇒ a retry returns the first message (200); a template fills an empty text; `product_id` = product card (`compose_product_message` text + image, `Message.product` shown).
    - Channel disconnected ⇒ 409 «القناة غير مربوطة — لا يمكن الردّ.».
  - **Done when**: the message status lifecycle (queued → sent | failed) is diagrammed.
  - **Status**: written in official Step 44 (2026-10-28): `m27-inbox-channels.md#44-messages-incremental-read-and-replies--doc-224` — `?after=` incremental polling, reply body table, the queued → sent | failed lifecycle as a sequence diagram (`dispatch_channel_message` updates the same row; provider reason verbatim in `error_detail`), `client_id`/`Idempotency-Key` dedup (retry → 200 the first message), template fills empty text, product card via `compose_product_message`, 409 disconnected. No discrepancies.

- [x] **DOC-225** — Document chat-to-order conversion (`inbox/conversations/<id>/convert-to-order/`)
  - **Source**: INT-037 (M27), INT-007 (M06) · inventory Domain 13
  - **Output**: `docs/api/domains/13-channels-operations/m27-inbox-channels.md`
  - **Must document**:
    - The legacy `chat_to_order_service`: stock locked + decremented, shortage ⇒ `is_backordered` (not refused), `sales_channel='chat'`, channel traffic source, channel default fulfilment status.
    - Already linked ⇒ 409 «المحادثة مرتبطة بالطلب #…»; a confirmation message is posted in the thread.
    - Bugs fixed: orders were written in a fixed 'SAR' summing each product's own-currency price (now store currency, prices converted like M06) and no timeline event was written (now written).
  - **Done when**: request body, 409 and currency rule are documented.
  - **Status**: written in official Step 44 (2026-10-28): `m27-inbox-channels.md#45-chat-to-order-conversion--doc-225` — request body table, all `400` ChatToOrderError messages, `409` already-linked (re-checked under `select_for_update`), stock lock + decrement + backorder-not-refused, `sales_channel='chat'` + normalized traffic source + channel default fulfilment, the store-currency conversion rule, the new timeline event and the in-thread confirmation message. No discrepancies.

- [x] **DOC-226** — Document channel connections: list, Telegram connect, disconnect, OAuth start
  - **Source**: INT-037 (M27) · inventory Domain 13
  - **Output**: `docs/api/domains/13-channels-operations/m27-inbox-channels.md`
  - **Must document**:
    - `channels/` list; connection error = health task `connection_health='unhealthy'`.
    - `channels/telegram/connect` — getMe → setWebhook → install + bridge; bad token 400 `{bot_token}`; Telegram has no OAuth (an error shows the token form).
    - `channels/<code>/disconnect` — clears encrypted credentials + bridge rows and deactivates (conversations stay read-only).
    - `channels/<code>/oauth/start?return=` — same provider URL as the legacy screen; stores a validated return URL (same store host, `/dashboard/…`, no open redirect); callback returns `?connected=<code>` or `?oauth_error=<reason>` (page toasts it); legacy hub flow unchanged.
  - **Done when**: the OAuth round trip is documented as a sequence diagram.
  - **Status**: written in official Step 44 (2026-10-28): `m27-inbox-channels.md#51-connection-list-telegram-connect-disconnect--doc-226` (list row + the four unhealthy messages from the health task; Telegram getMe → setWebhook → install + bridge, bad token 400 `{bot_token}`; disconnect clears credentials + bridge and keeps conversations read-only) and `#52-oauth-start-and-the-validated-round-trip--doc-226` — `_safe_return` rules (no open redirect), 404 for non-OAuth codes, session-stored return, and the full round trip as a sequence diagram ending `?connected=<code>` / `?oauth_error=`; legacy hub flow unchanged. No discrepancies.

- [x] **DOC-227** — Document keyword triggers and reply templates (`channels/keywords[/<id>]`, `channels/templates[/<id>]`)
  - **Source**: INT-037 (M27) · inventory Domain 13
  - **Output**: `docs/api/domains/13-channels-operations/m27-inbox-channels.md`
  - **Must document**:
    - Keywords unique case-insensitively whatever the match type (Django `unique`; mock aligned: unique per word).
    - `ChannelReplyTemplate` (new — staff quick replies; Django only had system notification templates); template list readable by every inbox member, writes owner-only.
  - **Done when**: CRUD bodies and uniqueness rule are documented.
  - **Status**: written in official Step 44 (2026-10-28): `m27-inbox-channels.md#53-keyword-triggers--doc-227` (CRUD bodies, every validation message, the case-insensitive uniqueness = DB `unique=True` + service `iexact` check «يوجد محفّز بالكلمة نفسها.») and `#54-reply-templates--doc-227` (`ChannelReplyTemplate` new in INT-037, list readable by every inbox member / writes owner-only). Note recorded as an open item: the model's per-channel scoping (`channel_code`) is not part of the contract — API-created triggers fire on all channels. No discrepancies.

- [x] **DOC-228** — Document channel catalog sync, product links and TikTok category mapping
  - **Source**: INT-037 (M27) · inventory Domain 13, A.8, A.13
  - **Output**: `docs/api/domains/13-channels-operations/m27-inbox-channels.md`
  - **Must document**:
    - `channels/<meta|tiktok>/catalog-sync` and `…/run` — run = 409 when not connected / unhealthy, else sets `last_run_at` + queues Celery `sync_channel_catalog`; report = `ChannelProductLink` counts per status.
    - `channels/<code>/products[?sync_status]`; `…/products/<id>/resync` = new task `sync_channel_product`.
    - `channels/tiktok/categories` (static starter list — no TikTok category API client yet — + any code saved from the legacy free-text screen); `channels/tiktok/category-mapping`.
    - Open item (pinned by `test_social_channels_phase2`): a product syncs to Meta only with a Meta category mapping, but no screen offers it — Meta sync reports every unmapped product as «لا يوجد ربط تصنيف…».
  - **Done when**: the open Meta mapping limitation is flagged in a callout.
  - **Status**: written in official Step 44 (2026-10-28): `m27-inbox-channels.md#55-catalog-sync-product-links-tiktok-categories--doc-228` — catalog-sync GET/PUT bodies (scope/categories/±50 percent/shield), run = 409 not connected or unhealthy + `last_run_at` + `sync_channel_catalog`, the per-status `ChannelProductLink` report, `products/?sync_status`, resync → `sync_channel_product`, the static TikTok starter list (+saved legacy codes) and the category-mapping body; the Meta no-screen mapping limitation flagged in a ⚠️ callout with the verbatim error. No discrepancies.

- [x] **DOC-229** — Document staff channel access (`channels/staff-access`)
  - **Source**: INT-037 (M27) · inventory Domain 13
  - **Output**: `docs/api/domains/13-channels-operations/m27-inbox-channels.md`
  - **Must document**:
    - Save writes the staff member's 4 rows at once (one toggle no longer silently hides the other channels); folds reply-without-view; WhatsApp rows added to the matrix.
  - **Done when**: request shape (4 rows per staff) is documented.
  - **Status**: written in official Step 44 (2026-10-28): `m27-inbox-channels.md#56-staff-channel-access--doc-229` — the GET matrix (4 rows per staff over meta/tiktok/telegram/whatsapp, whitelist display), the PUT body of changed cells, all-4-rows-at-once save (`update_or_create`), reply folded into view (`can_reply := can_view AND can_reply`), validation messages. No discrepancies.

- [x] **DOC-230** — Document M27 migrations, BFF wiring and tests
  - **Source**: INT-037 (M27) · A.3, A.9, A.12
  - **Output**: `docs/api/domains/13-channels-operations/m27-inbox-channels.md`
  - **Must document**:
    - Migration `products/0231_inbox_api`: `Conversation.source_platform`; `Message.status 'queued'` + `error_detail` + `client_id` + `product`; `ChannelCatalogSync.last_run_at`; `ChannelReplyTemplate`.
    - Celery: `dispatch_channel_message(message_id=…)`, `sync_channel_catalog`, `sync_channel_product`, health task (`connection_health`).
    - BFF: `api/bff/inbox/[...path]` + `api/bff/channels/[[...path]]` → `liveOrMock(…, "channels", "/api/v1/<inbox|channels>/<path>/")`; `inbox/_mock/*` fixture-only; `.env.example` adds `channels`; OAuth link passes `?return=`.
    - Full 21-route table.
    - Tests: `api/test_channels_api.py` (10) + the 8 legacy `products.test_social_channels_phase*` suites.
  - **Done when**: the route table and Celery list are complete.
  - **Status**: written in official Step 44 (2026-10-28): the 21-route table in `m27-inbox-channels.md#3-endpoint-summary--the-21-routes`; `#6-gaps-closed-bugs-fixed-and-migrations--doc-230` — migration `products/0231_inbox_api` field by field, the Celery list (`dispatch_channel_message`, `sync_channel_catalog`, `sync_channel_product`, `check_channel_connection_health` every 15 min + the related inbound/media/shield/archive tasks), BFF wiring (`inbox/[...path]`, `channels/[[...path]]`, `liveOrMock(…, "channels", …)`, `_mock/*` fixture-only, `channels` in `.env.example`, `?return=` passthrough), the bugs-fixed list and the test inventory (10 API tests + 8 legacy `phase*` suites). No discrepancies.

- [x] **DOC-231** — Document marketplace connections: list, Amazon OAuth, Noon connect, disconnect, settings
  - **Source**: INT-038 (M28) · inventory Domain 13, A.10
  - **Output**: `docs/api/domains/13-channels-operations/m28-marketplaces.md`
  - **Must document**:
    - Provider `products/services/marketplaces/api_service.py` + `api/views_marketplaces.py` — 14 routes: `marketplaces/`, `amazon/oauth/start?return=`, `noon/connect`, `<market>/disconnect|settings|listings|listings/<id>|listings/push|jobs`, `jobs/`, `jobs/<id>/`, `jobs/<id>/errors.csv/`, `orders/`, `orders/<order_id>/confirm-shipment/`; before: full domain (`MarketplaceSettings`, `MarketplaceListing`, `MarketplaceSyncJob`, `MarketplaceFeed`, `MarketplaceOrderDetail`), encrypted install + public bridge (`connection_service`), Amazon SP-API OAuth, noon adapter, HTML only. No migration.
    - Gates FR-28.01: session 401 → `channels.marketplaces.manage` 403 → plan feature `marketplaces` 403 «ميزة الأسواق الإلكترونية غير مفعّلة في خطتك.».
    - Amazon OAuth from Next stores a validated return URL; callback pins amazon.sa automatically (legacy «confirm, not choose» step) then returns `?connected=amazon` or `?oauth_error=` (toast).
    - Noon connect needs seller id + country (SA/AE → market currency) — the frontend only sent the API key (dialog + mock aligned); fake adapter via `NOON_MARKETPLACE_ADAPTER`.
    - Settings: `import_marketplace_fulfilled_orders` toggle added to the contract; `auto_push` relabelled = re-send price/stock changes of published listings (not «publish new products»).
  - **Done when**: connect flows per market and settings fields are documented.
  - **Status**: written in official Step 44 (2026-10-28): `docs/api/domains/13-channels-operations/m28-marketplaces.md` — gate chain in `#2-access--gate-chain` (permission key checked **before** the plan feature, the reverse of M27 — noted in prose), hub row `#41-hub`, Amazon OAuth `#42-amazon-oauth` (validated return, state nonce, env-var error, callback auto-pins amazon.sa `SAUDI_MARKETPLACE_ID` then `?connected=amazon` / `?oauth_error=`, sequence diagram), noon connect `#43-noon-connect-and-disconnect` (seller id + country → market currency, `NOON_MARKETPLACE_ADAPTER` fake switch), settings `#44-settings-and-the-price-preview` (all fields + `import_marketplace_fulfilled` added; `auto_push` documented by its real meaning and UI labels — re-sending price/stock changes of published listings). No discrepancies.

- [x] **DOC-232** — Document marketplace listings, identifiers and price computation
  - **Source**: INT-038 (M28), A.6 · inventory Domain 13
  - **Output**: `docs/api/domains/13-channels-operations/m28-marketplaces.md`
  - **Must document**:
    - One listing row per available product/variant per market — created lazily by `materialize_listings` (bulk-creates missing ones as `needs_identifier`/unpublished; no auto-push).
    - Price = override, else store price → SAR → × fx → × (1 + markup) (`compute_effective_price`); `display_computed_price` = same without override.
    - Identifier types per adapter (Amazon asin/ean/upc/gtin, noon nsku/ean/gtin) + format check (ASIN `B0…`, EAN 13, UPC 12, GTIN 8–14, NSKU) → `set_identifier` (unpublished until pushed).
  - **Done when**: the price formula and identifier format table are published.
  - **Status**: written in official Step 44 (2026-10-28): `m28-marketplaces.md#5-listings-identifiers-and-prices--doc-232` — lazy `materialize_listings` (one row per product/variant per market, `needs_identifier`/unpublished, no auto-push, seller-SKU default + duplicate skip), the price formula block (`override` else `base_sar × fx × (1 + markup%)`, `display_computed_price` = same without override), the identifier type/format table per adapter (asin/nsku/ean/upc/gtin with regexes and error messages), `set_identifier` → unpublished until pushed, price-override rules. No discrepancies.

- [x] **DOC-233** — Document listing push and marketplace jobs (`listings/push`, `<market>/jobs`, `jobs/`, `jobs/<id>/`, `errors.csv`)
  - **Source**: INT-038 (M28) · inventory Domain 13, A.8
  - **Output**: `docs/api/domains/13-channels-operations/m28-marketplaces.md`
  - **Must document**:
    - Push = 409 when not connected / re-auth; listings without an identifier recorded in the same job as `NO-ID` errors; the rest marked published and pushed — Amazon bulk Feeds job above 20 (409 while one runs), else one task per listing on the job.
    - `order_pull` / `fba_inventory` = legacy start functions (409 when one is live; FBA only where the adapter supports it).
    - Job view = counters + `triggered_by` label + summary (order pull created/updated/skipped, general error) + CSV link (legacy streamed CSV + NO-ID rows).
  - **Done when**: job types, 409 conditions and CSV columns are documented.
  - **Status**: written in official Step 45 (2026-10-29): `m28-marketplaces.md#6-listing-push-and-marketplace-jobs--doc-233` — the push split (NO-ID rows recorded in the same job, `400` «كل القوائم المحددة تحتاج معرّفاً قبل الدفع.», Amazon Feeds bulk above `BULK_FEED_THRESHOLD = 20` with the live-job `409` «هناك عملية نشر جماعي جارية لهذا السوق — انتظر اكتمالها.», otherwise one task per listing on the market queue), the trigger 409s verbatim + the 30-minute stale-job takeover, the job view (counters, «التاجر»/«النظام…» labels, the order-pull summary «أُنشئ … · حُدّث … · تُخطّي …») and the errors CSV with its eight Arabic column headers. No discrepancies.

- [x] **DOC-234** — Document marketplace orders and shipment re-confirmation
  - **Source**: INT-038 (M28) · inventory Domain 13
  - **Output**: `docs/api/domains/13-channels-operations/m28-marketplaces.md`
  - **Must document**:
    - `orders/` = `MarketplaceOrderDetail` (`status_class`, fulfilment, confirmation mapping `'' → not_required`, `needs_tracking|queued → pending`).
    - `orders/<order_id>/confirm-shipment/` («إعادة تأكيد الشحنة») = `retry_failed_confirmation` only; confirmation is automatic on tracking entry — 409 unless failed; 409 for marketplace-fulfilled / already confirmed.
    - BFF: `api/bff/marketplaces/[[...path]]` → `liveOrMock(…, "marketplaces", "/api/v1/marketplaces/<path>/")`; `.env.example` adds `marketplaces`; `scripts/marketplaces-check.ts` follows the noon dialog.
    - Tests: `api/test_marketplaces_api.py` (9) + 5 legacy `products.test_marketplaces_phase*` suites.
  - **Done when**: the confirmation status mapping table is documented.
  - **Status**: written in official Step 45 (2026-10-29): `m28-marketplaces.md#7-marketplace-orders-and-shipment-re-confirmation--doc-234` — the row table, the full confirmation-status mapping table (`'' → not_required`, `needs_tracking|queued → pending`, `confirmed`, `failed`) and every re-confirmation `409` verbatim (incl. the needs_tracking hint «أدخل رقم التتبع ليُؤكَّد الشحن للسوق آلياً.»); BFF/env/check-script noted in §8. No discrepancies.

- [x] **DOC-235** — Document dropshipping metadata and supplier connections
  - **Source**: INT-039 (M29) · inventory Domain 13
  - **Output**: `docs/api/domains/13-channels-operations/m29-dropshipping.md`
  - **Must document**:
    - Provider `products/services/suppliers/api_service.py` + `api/views_dropshipping.py` — 27 routes under `/api/v1/dropshipping/`; before: `SupplierConnection`, `SupplierSyncJob`, `PricingRule`, `SupplierProduct` / `SupplierVariant`, `FeedMapping`, `DropshipStockHold`, `SupplierWebhookEvent`, `SupplierOrder`, adapter registry (CJ real · مخازن/قنوات fake · flat feed), pricing engine, services, self-chaining Celery jobs, HTML only.
    - Gate: session 401 → `channels.dropshipping.manage` 403 → plan feature `dropshipping` 403.
    - `meta/`; `suppliers/` (+ `attention_total`); `suppliers/<code>/` (+ `categories`); `connect/` `{credentials}` verified by the adapter first (missing/rejected key → `credentials.<field>` 400; rate limit 429); `disconnect/`; `settings/` GET/PUT.
    - Connect form renders Django `credential_fields` (مخازن asks for one API token — the mock's invented `store_id` is gone); `webhook_supported` / `inventory_sync_supported` capabilities; `reauth_required` («يتطلب إعادة الربط»).
    - Settings: «إحالة الطلبات» (auto-forward, COD auto-forward, default country, shipping method), interval hints (products/prices ≥ 60, inventory ≥ 15) — `catalog_sync_interval_min`, `price_sync_interval_min`.
  - **Done when**: capability flags and settings bounds are documented.
  - **Status**: written in official Step 45 (2026-10-29): `m29-dropshipping.md#4-suppliers-connections-and-settings--doc-235` — the 3-gate chain (`channels.dropshipping.manage` before the plan feature, as M28), the supplier row with `attention_total`/capability flags/`credential_fields` rendered from the registry (مخازن's single «رمز الربط (API Token)»), connect (adapter-first verification: `400` `credentials.<field>`, `429`, `502`), disconnect, and the settings bounds table (products/prices 60–10080, inventory max(15, adapter floor)–1440) + «إحالة الطلبات» forwarding options. `meta/` documented in §7.1. No discrepancies.

- [x] **DOC-236** — Document supplier inventory sync, webhook rotation, catalog browse and import
  - **Source**: INT-039 (M29) · inventory Domain 13
  - **Output**: `docs/api/domains/13-channels-operations/m29-dropshipping.md`
  - **Must document**:
    - `suppliers/<code>/sync-inventory/` → 202.
    - `webhook/rotate/` → URL **and** signing secret, once, `Cache-Control: no-store`.
    - `catalog/?q&category&import_status&page`; CJ (`catalog_mode=search`) browses live: page = CJ page (24 = table size), a hit not stored yet has id `ext:<pid>`; «importing» computed from the supplier's live import job (never stored).
    - `import/` → 202 `{job_id, count}`.
  - **Done when**: the `ext:<pid>` id scheme and 202 responses are documented.
  - **Status**: written in official Step 45 (2026-10-29): `m29-dropshipping.md#5-inventory-sync-webhook-rotation-catalogue-import--doc-236` — `sync-inventory/` → `202 {job_id}` with its three `409`s, `webhook/rotate/` returning URL **and** secret once with `Cache-Control: no-store`, the two catalogue shapes (CJ `catalog_mode='search'` live browse where the UI page **is** the CJ page of 24 and an unstored hit carries `ext:<pid>`; the local stored catalogue otherwise), the computed-never-stored `importing` state, and `import/` → `202 {job_id, count}` (500-batch cap, ext ids, one-import-at-a-time `409`). No discrepancies.

- [x] **DOC-237** — Document pricing rules: CRUD, simulation and apply
  - **Source**: INT-039 (M29), A.6 · inventory Domain 13
  - **Output**: `docs/api/domains/13-channels-operations/m29-dropshipping.md`
  - **Must document**:
    - `pricing-rules/` CRUD · `simulate/` · `<id>/apply/`.
    - Translation: `scope_type` all/supplier/category ↔ `PricingRule.scope` + `supplier_code` / `category_prefix`; `fx_source` daily ↔ `store_setting` (daily rate shown = `StoreSetting.usd_to_sar`); UI priority «الأصغر أولاً» = `1000 − PricingRule.priority` (Django «الأعلى أولاً»); `scope='product'` rules (legacy per-product) stay out of the contract.
    - Simulation = the same `RuleBook` / `compute_sell_price` with the draft rule inserted (affected = imported, unlocked products the chain would give it); apply = a `price_sync` job on exactly those products.
    - New rule fields: shipping estimate / fixed add / min margin %.
  - **Done when**: the priority inversion formula is documented with an example.
  - **Status**: written in official Step 45 (2026-10-29): `m29-dropshipping.md#6-pricing-rules--doc-237` — the engine formula block ((cost_sar + shipping) × (1 + markup%) + fixed_add, floored by min margin, then rounding), the selection chain, the contract⇄model translation table with the **priority inversion `priority = 1000 − PricingRule.priority`** and a worked example (UI 1 → stored 999 beats UI 50 → stored 950), `scope='product'` exclusion, `fx_source daily` = `StoreSetting.usd_to_sar`, simulation (same `RuleBook`/`compute_sell_price`, `affected_count` = imported unlocked products, below-cost flag, overlaps) and apply (a `price_sync` job over exactly those products), plus every CRUD validation message and the three new fields (shipping/fixed add/min margin). No discrepancies.

- [x] **DOC-238** — Document feeds (`feeds/`, `<id>/`, `mapping/`, `preview/`, `approve/`, `run/`, `errors.csv/`)
  - **Source**: INT-039 (M29) · inventory Domain 13
  - **Output**: `docs/api/domains/13-channels-operations/m29-dropshipping.md`
  - **Must document**:
    - Create: multipart file or `{url}`; reader = `FeedReader` (shared with CSV product import).
    - Mapping: the owner-approved 20 M29 keys ↔ `FeedMapping.column_map` (`sku` → `external_product_id`; `variant_sku` switches on `parent_column` grouping with `sku` → `parent_id`); legacy-only keys (`currency`, `image_url_2..5`) survive a save from Next.js; a column used twice → `mapping.<key>` error.
    - Status draft/mapped/approved/running/completed… derived from mapping version + latest job.
    - Preview = `validate_feed` + first rows' raw values with error messages; approve needs `approvable` (≤ 5 % errors, contiguous parents) and no longer starts the import (Run does).
    - Schedule `schedule_interval_min` (60/360/720/1440…) for link feeds only — uploaded files refused; `fetch_scheduled_feeds_for_tenant` honours it with 5-min slack.
    - Six new `FEED_FIELDS` (no auto-suggest synonyms): `gtin` (barcode fallback), `extra_images` (several URLs in one cell), `brand` → `Product.brand` (created by name), `price` (supplier fixed selling price ≥ cost; locks price against re-pricing), `compare_at_price` → `Product.old_price` (when above price), `supplier_url` (kept on the supplier product).
  - **Done when**: the full 20-key mapping table and the feed status machine are published.
  - **Status**: written in official Step 45 (2026-10-29): `m29-dropshipping.md#7-flat-feeds--doc-238` — create (multipart or `{url}`, `FeedReader`, extensions `csv/tsv/txt/xlsx`, 20-active-feeds cap), the **full 20-key mapping table** (contract key → model field, required flags, the six new fields with their behaviours: `price` ≥ cost + locks re-pricing, `compare_at_price` → `old_price`, `gtin` barcode fallback, `extra_images` multi-URL cell, `brand` created by name, `supplier_url` kept on the supplier row), `variant_sku` switching parent-column grouping, legacy-only keys surviving a Next save, the used-twice column error, the draft→mapped→approved→running/job status machine, preview (raw first-10 rows + error counts), approve (≤ 5 % errors + contiguous parents, no longer starts the import) vs run (`202 {job_id}`), the link-only schedule (60–10080 min server-side; the roadmap's 60/360/720/1440 are the UI presets) with the 5-minute fetch slack, and the errors CSV. No discrepancies.

- [x] **DOC-239** — Document supplier orders and resubmission (`orders/?status&supplier&attention&page`, `orders/<id>/resubmit/`)
  - **Source**: INT-039 (M29) · inventory Domain 13, A.13
  - **Output**: `docs/api/domains/13-channels-operations/m29-dropshipping.md`
  - **Must document**:
    - List filters and resubmit behaviour (via the order-forward service).
    - Legacy-only (not in the contract): order address correction / poll now / cancel at supplier, cost-rise alerts + manual price unlock on «منتجاتي», feed delimiter/encoding/price-unit/currency-column options, live stock check at checkout.
  - **Done when**: the legacy-only list is flagged as "HTML only".
  - **Status**: written in official Step 45 (2026-10-29): `m29-dropshipping.md#8-supplier-orders--doc-239` — filters (`status`, `supplier`, `attention=1|0` over `failed · rejected · held`), the order row, resubmit via the order-forward service (`409` «لا يمكن إعادة إرسال هذا الطلب — ليس بانتظار المراجعة ولا فاشلاً.»), and the legacy-only block flagged **HTML only** in a ⚠️ callout (address correction, poll now, supplier cancel, cost-rise alerts + price unlock on «منتجاتي», delimiter/encoding/price-unit/currency options, checkout live-stock check). No discrepancies.

- [x] **DOC-240** — Document dropshipping jobs, retries and error CSVs
  - **Source**: INT-039 (M29) · inventory Domain 13, A.8
  - **Output**: `docs/api/domains/13-channels-operations/m29-dropshipping.md`
  - **Must document**:
    - `jobs/?supplier&status&job_type&page` (accepts `supplier_code: all`) · `jobs/<id>/` · `retry/` · `errors.csv/`.
    - Job type mapping `catalog_pull → products · price_sync → prices · inventory_sync → inventory · product_import → import · feed_import → feed`; `order_*` types never created and excluded.
    - Retry per type: failed import rows + fetch failures, whole batch after an auth failure, feed re-run, inventory/catalog/reprice.
    - Self-chaining Celery jobs + hourly catalog beat (now also periodic re-pricing of unlocked products, first pass only sets the baseline).
  - **Done when**: the job type table and retry rules are complete.
  - **Status**: written in official Step 45 (2026-10-29): `m29-dropshipping.md#9-jobs--doc-240` — the **job type mapping table** (catalog_pull/catalog_search → products, price_sync → prices, inventory_sync → inventory, product_import → import, feed_import → feed; `order_*` never created and excluded), `supplier_code: all` accepted, the job row, the errors CSV («المرجع»/«الرمز»/«الرسالة», formula-injection guard), the **per-type retry table** (failed rows + fetch failures, whole batch after auth failure, feed re-run, inventory, reprice, catalog) and the background machinery (self-chaining chunks with the store lock, hourly catalog Beat honouring per-supplier intervals, periodic re-pricing whose first pass only sets the baseline, the 5-minute inventory cadence and the poll/purge/health schedules). No discrepancies.

- [x] **DOC-241** — Document M29 migrations, BFF wiring and tests
  - **Source**: INT-039 (M29) · A.3, A.9, A.12
  - **Output**: `docs/api/domains/13-channels-operations/m29-dropshipping.md`
  - **Must document**:
    - Migration `products/0232_dropshipping_api`: `SupplierConnection.catalog_sync_interval_min` (replaces fixed 6 h, same default) / `price_sync_interval_min` / `last_price_sync_at`; `FeedMapping.schedule_interval_min`.
    - Mock aligned (credentials, bounds, secret, capabilities, engine formula, file-schedule refusal).
    - BFF: `api/bff/dropshipping/[[...path]]` → `liveOrMock(…, "dropshipping", "/api/v1/dropshipping/<path>/", …)`; `.env.example` lists `dropshipping`; `scripts/dropshipping-check.ts` updated.
    - Tests: `api/test_dropshipping_api.py` (11).
  - **Done when**: the 27-route table is complete.
  - **Status**: written in official Step 45 (2026-10-29): the **27-route table** in `m29-dropshipping.md#3-endpoint-summary--the-27-routes` (verified against `api/urls.py:604-630`); `#10-migrations-bff-wiring-and-tests--doc-241` — migration `products/0232_dropshipping_api` field by field (`catalog_sync_interval_min`/`price_sync_interval_min` default 360 replacing the fixed 6 h, `last_price_sync_at`, `FeedMapping.schedule_interval_min`), mock alignment list, BFF `api/bff/dropshipping/[[...path]]` via `liveOrMock(…, "dropshipping", …)`, `dropshipping` in `.env.example`, `scripts/dropshipping-check.ts`, tests `api/test_dropshipping_api.py` (11) + 5 legacy phase suites. No discrepancies.

- [x] **DOC-242** — Document POS gates, context and registers (`pos/context/`, `pos/registers/?location`)
  - **Source**: INT-033 (M16) · inventory Domain 13, A.5
  - **Output**: `docs/api/domains/13-channels-operations/m16-pos.md`
  - **Must document**:
    - Provider `products/services/pos_service.py` + `api/views_pos.py` — 15 routes under `/api/v1/pos/`; before: `CashRegister`, `Shift`, `ShiftCashMovement`, `OTPChallenge`, HTML `products/views/staff_pos.py`, no `pos` feature.
    - Gates in order: session 401 → plan feature `pos` 403 `{detail, code: feature_disabled}` → locations = active `StaffLocationRole` ∩ `has_pos_terminal` (owner: all) → M18 keys (`discounts.apply`, `orders.refund`; variance = owner / `staff.manage` / «مدير الفرع|المتجر»).
    - `Feature(pos, requires_plan=True)` — open to all while subscriptions are off (migration `billing/0013_seed_pos_feature`).
  - **Done when**: the gate chain and register filtering are documented.
  - **Status**: written in official Step 45 (2026-10-29): `m16-pos.md` (new page, part 1 — DOC-243 → 248 follow in Step 46) `#2-access--gate-chain` (session 401 → plan feature `pos` `403 {detail, code: feature_disabled}` «ميزة نقطة البيع غير مفعّلة في خطتك.» → `StaffLocationRole ∩ has_pos_terminal` locations → M18 keys incl. variance = owner/`staff.manage`/«مدير الفرع»·«مدير المتجر»), `#3-endpoint-summary--the-14-routes`, `#4-cashier-context` (locations, discount ceiling, `can_discount`/`can_refund`, `can_resolve_variance`, force-close notice), `#5-registers` (location filter `403` «لست معيَّناً على هذا الموقع.», disabled register shown only while an open shift sits on it). `Feature(pos, requires_plan=True)` seeded by `billing/0013` and open to all while subscriptions are off. **Discrepancy**: the roadmap counts 15 routes; `api/urls.py:521-534` registers **14** — the force-close of an abandoned shift is a Celery transition surfaced only via `context.force_closed_notice`, not an HTTP route (flagged in the page's §3 callout).

- [x] **DOC-243** — Document POS shifts: open, current, pending
  - **Source**: INT-033 (M16) · inventory Domain 13
  - **Output**: `docs/api/domains/13-channels-operations/m16-pos.md`
  - **Must document**:
    - `shifts/` POST — 200 = your own live shift on that register; 409 «لديك وردية قائمة على …» / «الجهاز مشغول بوردية …»; disabled register 400.
    - `shifts/current/`, `shifts/pending/`.
    - Opening a new shift clears `force_close_notice_seen`.
  - **Done when**: every open-shift outcome has its status and message.
  - **Status**: written in official Step 46 (2026-10-29): `m16-pos.md#6-shifts-open-current-pending--doc-243` — the full outcome table (`200` idempotent open, both `409` f-strings, the disabled-register `400`, the IntegrityError race «الجهاز مشغول بوردية أخرى.», opening-float `400`), `current/` (live = open **or** pending) and `pending/` (resolver-only), and the notice-clearing rule. No discrepancies.

- [x] **DOC-244** — Document cash movements, shift close and variance resolution
  - **Source**: INT-033 (M16), INT-022 (M18) · inventory Domain 13, A.7
  - **Output**: `docs/api/domains/13-channels-operations/m16-pos.md`
  - **Must document**:
    - `shifts/<id>/movements/` (`ShiftCashMovement.note`), `close/`, `resolve-variance/`.
    - Rules (spec §5 = the mock; legacy screens call the same service): overage or zero → `closed`; shortage only → `pending_manager_approval` + `ApprovalRequest(shift_shortage)`; the manager's decision (approve OR reject) closes the shift — on the device (`resolve-variance`, shift `version`, no self-approval) or from the approvals screen (`staff_service.resolve_approval` → `settle_shift_for_approval`). Before: any variance parked and «reject» reopened the shift.
    - `Shift.variance` keeps legacy meaning (expected − actual); `display_variance` = actual − expected.
  - **Done when**: the variance sign convention is called out explicitly.
  - **Status**: written in official Step 46 (2026-10-29): `m16-pos.md#7-cash-movements-close-and-variance-resolution--doc-244` — movements (mandatory note «اذكر سبب الحركة.», cash-out ≤ expected «المبلغ أكبر من النقد المتوقع في الدرج.», idempotent replay), close (expected formula, overage/zero → closed, shortage only → `pending_manager_approval` + `ApprovalRequest(shift_shortage)`), resolve-variance (every check/message incl. no self-approval «لا يمكنك اعتماد عجز ورديتك.» and both decision outcomes closing the shift; the M18-screen path `staff_service.resolve_approval` → `settle_shift_for_approval`), the **sign convention callout** (`Shift.variance` = expected − actual vs contract `display_variance` = actual − expected) and the before-behaviour note. No discrepancies.

- [x] **DOC-245** — Document POS product search, quote and sales (`pos/products/`, `pos/quote/`, `pos/orders/` GET/POST, `pos/orders/<id>/`)
  - **Source**: INT-033 (M16), INT-007, INT-024 · inventory Domain 13, A.6, A.7
  - **Output**: `docs/api/domains/13-channels-operations/m16-pos.md`
  - **Must document**:
    - `products/?q&barcode&location` — bundles hidden with bookable/auction products.
    - Sale = real M06 order (`sales_channel=pos`, `completed`/`paid`, `payment_method` `pos_cash` | `pos_sharwa_pay`, `source_location` = register's) + `PosReceipt` snapshot (number `POS-<shift>-<seq>`, lines with discount %, `discount_allocated` per item incl. the cart share).
    - Prices converted to the store currency (Django authority — no «mixed currencies» error live).
    - Stock leaves the register's location via `inventory_service._apply_delta` (`LocationInventory` when multi-location, else product/variant) + `StockMovement(sale)`; serialized units marked sold; cash → `ShiftCashMovement(sale)`; Sharwa Pay = recorded outside the drawer, no wallet debit (no customer identity at the till).
    - Idempotency SC-16.3: `PosIdempotencyKey` inserted first in the write transaction (header `Idempotency-Key` or body) — replay/double click returns the first receipt/movement/refund (200).
  - **Done when**: the sale side-effects list and idempotency contract are documented.
  - **Status**: written in official Step 46 (2026-10-29): `m16-pos.md#8-product-search-quote-and-sales--doc-245` — search (`sellable()` excludes bookable/auction **and bundles**, barcode `exact`, device-location stock), quote (server-only totals, every per-line error verbatim, `discount_exceeds_limit`), the sale (mandatory `Idempotency-Key`, the M06 order fields, `POS-<shift>-<seq>` numbering, `discount_allocated` with the proportional cart share, stock via `_apply_delta` + `StockMovement(sale)` + serialized units, cash vs Sharwa-Pay-outside-the-drawer, timeline event, replay → the first receipt with 200) and the **idempotency contract** (`PosIdempotencyKey` claimed first in the write transaction, typed keys, «مفتاح منع التكرار مستخدم لعملية أخرى.»). No discrepancies.

- [x] **DOC-246** — Document POS discount ceiling, manager code and discount approvals (`pos/discount-approvals/`)
  - **Source**: INT-033 (M16), INT-022 · inventory Domain 13, A.10
  - **Output**: `docs/api/domains/13-channels-operations/m16-pos.md`
  - **Must document**:
    - Ceiling = highest `Role.max_discount_percent` among the staff's roles granting `discounts.apply` at the register's location (NULL = none; owner no ceiling); over it → 403 `discount_exceeds_limit`.
    - `manager_code` = hashed `StoreSetting.pos_manager_code_hash` set with `manage.py set_pos_manager_code --schema=… <code>`; 5 wrong / 15 min lock per register; under DEBUG `2468` works while none is set → approved `discount_exception`.
    - Or `approval_id` from `discount-approvals/`: pending 409, rejected 403, covers ONE receipt — reuse 409 (mock aligned).
  - **Done when**: the three discount paths are documented as a decision table.
  - **Status**: written in official Step 46 (2026-10-29): `m16-pos.md#9-discount-ceiling-manager-code-and-approvals--doc-246` — the four-row **decision table** (within ceiling / manager code with the 5-fails-15-min register lock, `set_pos_manager_code`, DEBUG `2468` while unset / pre-approved `approval_id`: pending 409, rejected 403, one-receipt coverage + reuse 409, granted-% ceiling 403 / neither → `403 {code: discount_exceeds_limit, …}`) plus the `discount-approvals/` request (`201`, «أُرسل طلب الاعتماد إلى المدير.»). No discrepancies.

- [x] **DOC-247** — Document POS refunds with OTP step-up (`pos/orders/<id>/refund/`)
  - **Source**: INT-033 (M16), INT-020 · inventory Domain 13
  - **Output**: `docs/api/domains/13-channels-operations/m16-pos.md`
  - **Must document**:
    - `refund_service.process_order_refund(method='manual')` + `ShiftCashMovement(refund)` for cash receipts; needs your open shift; permission `orders.refund`.
    - Over `StoreSetting.pos_refund_otp_threshold` (200.00 default, store currency) without a code → 428 + `OTPChallenge(large_refund)` bound to receipt + amount, sent to the store WhatsApp (3 sends / 10 min); 3 wrong codes → 429 lock 15 min; under DEBUG `123456`.
  - **Done when**: the 428 → OTP → retry flow is diagrammed.
  - **Status**: written in official Step 46 (2026-10-29): `m16-pos.md#10-refunds-with-otp-step-up--doc-247` — gate chain (`orders.refund`, open shift «افتح وردية لتسجيل الاسترجاع في الدرج.», refundable cap «أقصى مبلغ قابل للاسترجاع …»), the OTP step-up (`428 {code: otp_required…}`, challenge bound to receipt+amount, store-WhatsApp delivery, 3 sends/10 min, 3 attempts/15-min lock «أُقفل الاسترجاع مؤقتاً بعد 3 محاولات خاطئة…», reused code 409, DEBUG `123456`), the `428 → OTP → retry` **Mermaid sequence diagram**, and the settlement (`process_order_refund(manual)`, cash-only drawer refund movement, timeline event, idempotent replay). No discrepancies.

- [x] **DOC-248** — Document POS force-close, migrations, BFF wiring and tests
  - **Source**: INT-033 (M16) · A.3, A.8, A.9, A.12
  - **Output**: `docs/api/domains/13-channels-operations/m16-pos.md`
  - **Must document**:
    - Force close: Celery task bumps `version` and raises `force_close_notice_seen`, cleared when the cashier opens a new shift.
    - Migration `products/0229_pos_api`: `Shift.opened_by` / `ShiftCashMovement.created_by` nullable (NULL = owner), `Shift.version` / `approval` / `force_close_notice_seen` (old rows marked seen), `ShiftCashMovement.note`, `PosReceipt`, `PosIdempotencyKey`, `StoreSetting.pos_refund_otp_threshold` / `pos_manager_code_hash`; `billing/0013_seed_pos_feature`.
    - BFF: `api/bff/pos/[...path]` → `liveOrMock(…, "pos", "/api/v1/pos/<path>/")` (`__reset` fixture-only); `.env.example` adds `pos`.
    - Tests: `api/test_pos_api.py` (17) + staff/orders/inventory/auth/dashboard/tasks suites.
  - **Done when**: the 15-route table is complete.
  - **Status**: written in official Step 46 (2026-10-29): `m16-pos.md#11-force-close-migrations-bff-wiring-and-tests--doc-248` — force close (Beat every 30 min, 12-hour `SHIFT_MAX_DURATION_HOURS`, version bump + unseen notice, cleared on the next open), migration `products/0229_pos_api` field by field + `billing/0013_seed_pos_feature`, BFF/env/`__reset`, and the test inventory (17 `test_pos_api.py` methods + the legacy suites). The route table stands at the **14 registered routes** — the roadmap's 15-route count stays the Step-45 discrepancy (force-close has no HTTP route; §3 callout). No new discrepancies.

- [x] **DOC-249** — Document merchant bookable services and availability (`bookings/services/`, `bookings/services/<id>/availability/`)
  - **Source**: INT-036 (M26) · inventory Domain 13
  - **Output**: `docs/api/domains/13-channels-operations/m26-bookings.md`
  - **Must document**:
    - Provider `products/services/booking_service.py` + `api/views_bookings.py`; before: `ServiceAvailability` (0 = Monday, several windows a day, `is_active`), `BookingSlot` (partial unique `(product, start_datetime)` on held/booked, `session_key`, `held_until`, `order`), HTML, legacy `available_slots_api` and `book_appointment`. No migration.
    - `services/` — bookable, non-archived; `availability_count` = ACTIVE windows; image.
    - Availability GET/PUT — full replacement of active windows; per-row errors `{results: [{field: [msg]}]}` for end ≤ start / overlap / weekday ∉ 0–6; windows paused on the legacy screen untouched.
    - Gate: session 401 → plan feature `bookings` 403 «ميزة الحجوزات غير مفعّلة في خطتك.»; no M18 key.
  - **Done when**: the weekday convention (0 = Monday) and PUT replacement semantics are documented.
  - **Status**: written in official Step 46 (2026-10-29): `m26-bookings.md#4-bookable-services-and-availability--doc-249` — the services row (active-window count, image), availability GET/PUT as a **full replacement** (per-row `{results: [{field: [msg]}]}` errors incl. «يوم غير صالح (0 = الاثنين … 6 = الأحد).», overlap, end ≤ start; 70-window cap; paused windows untouched; no effect on existing slots), the **weekday convention (0 = Monday, `date.weekday()`)** spelled out, and the gate (session → `bookings` feature «ميزة الحجوزات غير مفعّلة في خطتك.», **no M18 key**). No discrepancies.

- [x] **DOC-250** — Document merchant slot list and cancellation (`bookings/slots/`, `bookings/slots/<id>/cancel/`)
  - **Source**: INT-036 (M26) · inventory Domain 13
  - **Output**: `docs/api/domains/13-channels-operations/m26-bookings.md`
  - **Must document**:
    - `?from&to&product&status` — store-zone day bounds, `to` inclusive; default held+booked; `is_expired`; customer from the order else «زائر المتجر».
    - Cancel — 409 «هذا الحجز ملغى مسبقاً.»; `order_effect` names the untouched order; `AuditLog booking.cancel`.
  - **Done when**: filters and cancel effects are documented.
  - **Status**: written in official Step 46 (2026-10-29): `m26-bookings.md#5-merchant-calendar-and-cancellation--doc-250` — filters (store-zone day bounds, **`to` inclusive**, status list default `held,booked` with the unknown-status 400, 2000-row cap), the row incl. computed `is_expired` and the customer from the order else «زائر المتجر», and cancel («هذا الحجز ملغى مسبقاً.» 409, `order_effect` naming the untouched order «بقي الطلب #<id> كما هو؛ راجعه لاسترجاع المبلغ إن لزم.», `AuditLog booking.cancel`). No discrepancies.

- [x] **DOC-251** — Document buyer slot availability and holds (`catalog/products/<id>/slots/?date`, `…/slots/hold/`)
  - **Source**: INT-036 (M26), INT-012 · inventory Domain 13
  - **Output**: `docs/api/domains/13-channels-operations/m26-bookings.md`
  - **Must document**:
    - `slots/?date` → `{date, timezone, slots[{start_datetime, end_datetime, status}], next_available_date}` (21-day scan); Django-first via `storefrontAdapter` (no switch); feature gate applies to buyer rows too.
    - `slots/hold/` `{start_datetime, release_slot_id?}` → 201 `{slot_id, start_datetime, held_until}` · 409 «لم يعد هذا الموعد متاحاً.» · 400 `{start_datetime}` · 429 past 10 live holds per session.
    - Slot rules: candidates every 30 min of `booking_duration_minutes` inside each active window; overlapping a booking = `booked`, a live hold = `held`; past times dropped; all times in `StoreSetting.timezone` (legacy used server zone) as ISO with offset; hold 15 min (`BOOKING_HOLD_MINUTES`); same session + same time returns the live hold as is; race guarded by the partial unique (IntegrityError ⇒ 409).
  - **Done when**: the slot-generation algorithm is documented step by step.
  - **Status**: written in official Step 46 (2026-10-29): `m26-bookings.md#6-buyer-slots-and-holds--doc-251` — the `?date` response (`{date, timezone, slots, next_available_date}` with the 21-day scan), the **slot-generation algorithm as five numbered steps** (active weekday windows → 30-min candidates of `booking_duration_minutes` → drop past → booked/held by overlap, expired holds never count → sorted ISO with the store-zone offset; legacy used the server zone), and hold (`201` + the 15-min `held_until`, same-session re-hold returned as is, `release_slot_id`, the `400/409/429` table incl. «لم يعد هذا الموعد متاحاً.» for both taken and the IntegrityError race, 10-live-holds cap, naive = store wall clock, Django-first via `storefrontAdapter` with the feature gate applying to buyer rows). No discrepancies.

- [x] **DOC-252** — Document booking bugs fixed and the cart/checkout integration
  - **Source**: INT-036 (M26), INT-013, INT-014 · inventory Domain 13
  - **Output**: `docs/api/domains/13-channels-operations/m26-bookings.md`
  - **Must document**:
    - Bugs fixed: an expired hold stayed `held` forever (blocked the time, stayed in cart, failed checkout) — now never counts, drops out of the cart (FR-26.07), released (`cancelled`) when the same time is held again; `book_appointment` accepted any instant — now only offered times; buy-now included the session's cart bookings — now separate `cart_bookings` / `buy_now_bookings` (gift none) and `booking_slot_ids` from effective cart lines (legacy HTML checkout too); `manage_service_availability` lacked `require_feature('bookings')`.
    - Cart: `cart/actions/` add of a bookable product needs `start_datetime` → live hold joins `cart_bookings` (quantity 1; 409 when taken); decrease/remove_line releases the hold; `cart_count` / `product_qty` count bookings; clearing the cart releases holds; cart «+» disabled on an appointment line.
    - Checkout: buy-now of a service holds `start_datetime` into `buy_now_bookings` (409 `{detail, changed}` when taken); checkout turns holds `booked` (`reserve_and_create_order`); storefront `is_bookable` false while the feature is off (FR-26.01).
    - BFF: `api/bff/bookings/[...path]` → `liveOrMock(…, "bookings", "/api/v1/bookings/<path>/")`; `.env.example` adds `bookings`; mock aligned (15-min hold, 30-min step).
    - Tests: `api/test_bookings_api.py` (9).
  - **Done when**: the hold lifecycle (held → booked | expired → cancelled) is diagrammed.
  - **Status**: written in official Step 46 (2026-10-29): `m26-bookings.md#7-hold-lifecycle-and-the-cartcheckout-integration--doc-252` — the **hold-lifecycle Mermaid state diagram** (held → booked | expired → cancelled, re-hold releasing an expired row), all five bug fixes (expired-hold-forever, any-instant hold, buy-now isolation `cart_bookings`/`buy_now_bookings`, `booking_slot_ids` from effective lines, the missing `require_feature` gate), the cart integration (mandatory `start_datetime`, quantity-1 lines, decrease/remove/clear release holds, `cart_count`/`product_qty` counting bookings, the disabled «+»), buy-now (`409 {detail: «لم يعد هذا الموعد متاحاً.», changed: [product]}`), checkout (`reserve_and_create_order` locking + the expired-hold rejection message + holds → booked), BFF/`.env`/mock alignment and the 9 tests. No discrepancies.

### 1.19 Domain 14 API — Apps, AI & automation, support (التطبيقات والذكاء الاصطناعي والأتمتة والدعم)

The platform app catalogue (`appstore.App`, managed in the console) is installed per store (`StoreAppInstallation`); WhatsApp messaging (SharwaConnect) and the Sharwa AI support bot are apps gated by `app_marketplace` and by being installed AND effectively active. The AI bot hands conversations to humans through the support sessions lock service (M32). Both report back through public-schema webhooks routed by public session indexes.

- [x] **DOC-253** — Document the app catalogue and app detail (`apps/`, `apps/<code>/`)
  - **Source**: INT-040 (M30) · inventory Domain 14
  - **Output**: `docs/api/domains/14-apps-ai-support/m30-app-store.md`
  - **Must document**:
    - Provider `products/services/apps_api_service.py` + `api/views_apps.py` — 12 routes; before: `appstore.App` + `AppBillingOverride` (console since INT-032), `StoreAppInstallation`, `AppInstallationEvent`, `AppUsageLog`, `AppTemplate`, `AppBillingCharge`, `app_marketplace_service`, `template_service.TEMPLATE_REGISTRY`, `sharwaconnect_client`, HTML `views/apps.py` with a hard-coded two-app catalogue.
    - `''` — listed apps + installed ones the platform delisted since, flagged `is_listed:false` (§8; «لم يعد متاحاً للتثبيت», cannot be reinstalled).
    - `<code>/` — + `install_preview` from `App.is_billed_for_client` (store overrides beat global switches; not billed → «مجاني», no preview), `suspension_reason` from the latest suspension event.
    - Gate: session 401 → plan feature `app_marketplace` 403.
    - Code translation: `whatsapp` (models/tasks) ⇄ `whatsapp_bot` (contract) — `/dashboard/apps/whatsapp` is the app's own panel and would shadow `/dashboard/apps/[code]`; translated in one place.
  - **Done when**: the code translation and billing preview rules are documented.
  - **Status**: written in official Step 43 (2026-10-28): `m30-app-store.md` §4.1 (gate chain with «متجر التطبيقات غير مفعّل في خطتك.» / «إدارة التطبيقات لمالك المتجر فقط.», delisted-but-installed rule, per-store billing fields incl. the free-app-billed-by-override case, `install_preview` with its verbatim note, `suspension_reason`, the `whatsapp` ⇄ `whatsapp_bot` translation in one place; no discrepancies).

- [x] **DOC-254** — Document app lifecycle actions, events and charges
  - **Source**: INT-040 (M30) · inventory Domain 14
  - **Output**: `docs/api/domains/14-apps-ai-support/m30-app-store.md`
  - **Must document**:
    - `<code>/install|activate|deactivate/` — owner only (403); 409 duplicate / already in that state; 403 while suspended (activate was silently refused while `suspended_by_platform`); 404 delisted for a new install.
    - `<code>/events/` (`AppInstallationEvent`) · `<code>/charges/` (`AppBillingCharge`).
  - **Done when**: each action's error matrix is documented.
  - **Status**: written in official Step 43 (2026-10-28): `m30-app-store.md` §4.2 (the full error matrix per action with every verbatim sentence incl. the while-suspended 403, events (200 latest) and charges row shapes with the console-dues cross-link; no discrepancies).

- [x] **DOC-255** — Document WhatsApp app usage, summary, templates and connect URL
  - **Source**: INT-040 (M30) · inventory Domain 14, A.8
  - **Output**: `docs/api/domains/14-apps-ai-support/m30-app-store.md`
  - **Must document**:
    - Rows need the app installed and effectively active (409).
    - `whatsapp/usage/?status&event_type&from&to&page&page_size`; event mapping `ORDER_CREATED → order_new · ORDER_SHIPPED → order_shipping_update · ORDER_DELIVERED → order_delivered · ORDER_CANCELLED → order_cancelled · PAYMENT_RECEIVED → payment_confirmed` (legacy free keys pass through, unknown → manual); usage events gain `order_delivered`, `order_cancelled`, `payment_failed`; `AppUsageLog.order` links each row to its order.
    - `whatsapp/summary/`.
    - `whatsapp/templates/` · `<id>/` GET/PATCH — the six WhatsApp entries of `TEMPLATE_REGISTRY` with fixed ids 1–6, `{var}` stored ↔ `{{var}}` in the editor; preview via `render_template_safe` with sample values + store name; carry `key` + `is_custom` («نصّك المخصَّص / النص الافتراضي», «استعادة النص الافتراضي»); required variables enforced (`order_id`, + `status_label` for shipping updates), unknown variables refused, 1024-char limit, empty body restores the platform default; writes owner-only.
    - `whatsapp/connect-url/` — legacy SharwaConnect register-once + `create_store_invite`, live `connected` best-effort, `no-store`.
    - Celery: `dispatch_whatsapp_message`, `send_whatsapp_notification_async`, `order_events.notify_sharwaconnect_of_order_event` (both call `create_pending_usage_log(order=…)`).
  - **Done when**: the template variable rules and event mapping table are published.
  - **Status**: written in official Step 43 (2026-10-28): `m30-app-store.md` §4.3 (the 409 gate sentence, the full event-mapping table, usage params with the date error, summary counters, the six-template table with ids/labels/variables/required, the `{{var}}` ↔ `{var}` translation, preview samples, all PATCH rules verbatim, connect-url with its 502 sentence and `no-store`, the three Celery tasks with `create_pending_usage_log(order=…)`; no discrepancies).

- [x] **DOC-256** — Document M30 migrations, legacy-only features, BFF wiring and tests
  - **Source**: INT-040 (M30) · A.3, A.9, A.12, A.13
  - **Output**: `docs/api/domains/14-apps-ai-support/m30-app-store.md`
  - **Must document**:
    - Migration `products/0233_app_store_api`: `AppUsageLog.order` (nullable FK, `SET_NULL`).
    - Legacy-only: QR-pairing proxy (`whatsapp_qr_start/poll`, superseded by SharwaConnect panel), monthly sent counter on the old dashboard.
    - BFF: `api/bff/apps/[[...path]]` → `liveOrMock(…, "apps", "/api/v1/apps/<path>/", …)` with `sharwa-ai/*` on its own switch `sharwa_ai`; `.env.example` lists `apps`; mock aligned.
    - Tests: `api/test_apps_api.py` (7).
  - **Done when**: the 12-route table is complete.
  - **Status**: written in official Step 43 (2026-10-28): `m30-app-store.md` §3 (the complete 12-route table with the sharwa-ai-before-`<code>` ordering note), §5 (migration `0233` field, the activate-while-suspended fix), §6 (QR proxy + monthly counter legacy notes, BFF catch-all with the `sharwa_ai` split, the 7 tests; no discrepancies).

- [x] **DOC-257** — Document Sharwa AI status and reconnect (`apps/sharwa-ai/status/`, `reconnect/`)
  - **Source**: INT-041 (M31) · inventory Domain 14
  - **Output**: `docs/api/domains/14-apps-ai-support/m31-sharwa-ai.md`
  - **Must document**:
    - Provider `products/services/sharwa_ai_api_service.py` + `api/views_sharwa_ai.py` — 4 routes wired before `apps/<str:code>/`; before: HTML hub (`views/sharwa_ai_hub.py`, gateway `services/sharwa_ai_client`, random `ai_session_id` in public `WhatsAppSessionIndex`, `SupportBotSettings` form), `session-status` webhook, RS256 console SSO (`services/sharwa_ai_sso.py`).
    - `status/` → `{connected, connecting, error, connected_at, connected_phone_number, qr_image}`; first call after install starts the gateway session like the legacy pairing page; later calls ask the gateway live; a gateway outage never drops a known connection; DISCONNECTED / SESSION_EXPIRED / LOGGED_OUT / BANNED / FAILED mapped to Arabic messages; connected aliases normalised to `CONNECTED`.
    - `ai_connected_at` recorded once on the first CONNECTED (poll or webhook) and cleared with the phone on any failure state — single rule `record_status`.
    - `reconnect/` POST — same session id, fresh QR; 409 while connected; owner-only.
    - Gate: M30 gate + app installed and effectively active (409).
  - **Done when**: the gateway state → Arabic message table is published.
  - **Status**: written in official Step 43 (2026-10-28): `m31-sharwa-ai.md` §4.1 (status payload, first-call session start, live polling, outage rule, the gateway-state → Arabic message table verbatim, `record_status` single rule, reconnect with «واتساب مربوط فعلاً.»; no discrepancies).

- [x] **DOC-258** — Document Sharwa AI bot settings (`apps/sharwa-ai/settings/`)
  - **Source**: INT-041 (M31), A.10 · inventory Domain 14
  - **Output**: `docs/api/domains/14-apps-ai-support/m31-sharwa-ai.md`
  - **Must document**:
    - GET/PUT `SupportBotSettings`; all-or-nothing; `ai_enabled` boolean; override 1–50 or null (form refuses > 50 like the server); `platform_default_max_replies` = `SHARWA_AI_MAX_CONSECUTIVE_BOT_REPLIES` (default 4); writes owner-only.
  - **Done when**: field bounds are documented.
  - **Status**: written in official Step 43 (2026-10-28): `m31-sharwa-ai.md` §4.2 (payload, all-or-nothing PUT with both verbatim error sentences, 1–50/null bounds, platform default source and value 4, owner-only; no discrepancies).

- [x] **DOC-259** — Document the Sharwa AI console SSO token and postMessage handshake (`apps/sharwa-ai/console-token/`)
  - **Source**: INT-041 (M31) · inventory Domain 14, A.10
  - **Output**: `docs/api/domains/14-apps-ai-support/m31-sharwa-ai.md`
  - **Must document**:
    - POST → `{console_url, token, expires_in}` — `issue_console_token(tenant_ref=schema, sub=merchant:<schema>, role=merchant_admin)` (RS256); session pinned to the store via `auth_tenant_schema`; 503 when `SHARWA_AI_CONSOLE_URL` / SSO keys are missing; `Cache-Control: no-store` + `Referrer-Policy: no-referrer`; owner-only.
    - Security fix in Next.js: the token is never put in the URL (`?token=` forbidden) — open the console's plain URL, wait for `sharwa-console-ready` from that window and origin, post the token once (`sharwa-console-token`) to the console origin only; unclaimed token dropped at `expires_in` or unmount; trusted origin derived from `console_url` (not hard-coded `https://ai.sharwa.app`); mock token 900 s.
    - BFF: `api/bff/apps/sharwa-ai/*` on switch `sharwa_ai`; tests `api/test_sharwa_ai_api.py` (6); live session rows handed to INT-042.
  - **Done when**: the handshake is shown as a sequence diagram with the two message names.
  - **Status**: written in official Step 43 (2026-10-28): `m31-sharwa-ai.md` §4.3 (token payload and claims, `auth_tenant_schema` pin with its 401 sentence, both 503 sentences, response headers, the five-step handshake with a Mermaid sequence diagram naming `sharwa-console-ready` / `sharwa-console-token`, origin-from-`console_url` rule, TTL 900 s clamp, BFF split and the 6 tests; no discrepancies).

- [x] **DOC-260** — Document support sessions: list, counters and detail timeline
  - **Source**: INT-042 (M32) · inventory Domain 14
  - **Output**: `docs/api/domains/14-apps-ai-support/m32-support.md`
  - **Must document**:
    - Provider `products/services/support_api_service.py` + `api/views_support.py` — 11 routes; before: `SupportSession` (lock fields), `SupportMessage`, `BotToolCallLog`, `SupportTicket`, `support_lock_service` (`staff_takeover/release/send_reply`, `escalate_session`, `select_for_update`), HTML `views/support_hub.py`, `views/operations.support_tickets_view`, Celery reply task.
    - `sessions/?status&session_type&assigned_to_me&q&page` — order escalated → human_locked → bot_active → closed, then latest activity; `q` matches phone or party name; `ai:{installed, enabled}`.
    - `sessions/counters/`; `sessions/<id>/?after=<cursor>` (`can_takeover`, `ai`).
    - Timeline merges two tables: ids `2×message_id` / `2×tool_call_id+1`, ordered by time; opaque cursor `"<last message>.<last tool call>"` (numeric id still decodes); `system` rows rendered as quiet events; customer media «فتح المرفق» (signed URL).
    - Party name = latest order's customer name for the phone / the affiliate / the staff member, else the phone; owner's lock → `{id: null, name: «مالك المتجر»}`.
    - Tool-call inputs/outputs redacted server-side (token/secret/password/api-key/OTP/PIN/card, FR-31.07); `{"error": …}` results surface as `error`.
    - Gate: session 401 for reading (no plan feature, FR-32.01).
  - **Done when**: the id/cursor scheme and redaction list are documented.
  - **Status**: written in official Step 43 (2026-10-28): `m32-support.md` §4.1 (filters with both verbatim 400 sentences, priority ordering, `ai` flags, party-name resolution incl. «مالك المتجر», the `2×id` / `2×id+1` scheme, the dot-cursor with legacy decode, system rows, signed media, the full redaction key list and the `error` surfacing; no discrepancies).

- [x] **DOC-261** — Document session takeover/release/close and staff replies
  - **Source**: INT-042 (M32) · inventory Domain 14, A.7, A.8
  - **Output**: `docs/api/domains/14-apps-ai-support/m32-support.md`
  - **Must document**:
    - `sessions/<id>/takeover|release|close/ {version}` — 409 `{detail, session}` naming who got there first or on a stale version; permission `support.takeover_session` (owner implicitly, 403).
    - `SupportSession.version` bumped inside the lock service on takeover/release/escalate/close, checked under the same row lock; new `staff_close` refuses a session another member holds; release/close log a system row like takeover.
    - `sessions/<id>/messages/ {text, client_id}` → 201; same `client_id` again → same row 200 (`SupportMessage.client_id` unique per session, `sender_name` kept); reply written synchronously under the lock; Celery `deliver_staff_reply` (new) sends it on commit; `send_staff_reply_message` shares the delivery helper.
  - **Done when**: the lock/version contract and idempotent reply are documented.
  - **Status**: written in official Step 43 (2026-10-28): `m32-support.md` §4.2 (the version-checked action matrix with the 409 `{detail, session}` shape, `staff_close` refusal, the idempotent reply with 201/200 semantics and both text errors verbatim, the lock-first 409 sentence, synchronous write + `deliver_staff_reply` on commit; no discrepancies).

- [x] **DOC-262** — Document support tickets and assignees (`tickets/`, `tickets/counters/`, `tickets/<id>/`, `assignees/`)
  - **Source**: INT-042 (M32) · inventory Domain 14
  - **Output**: `docs/api/domains/14-apps-ai-support/m32-support.md`
  - **Must document**:
    - `tickets/?status&assigned_to=me|none|<id>&q&page` (+ `counters`) · POST · `<id>/` GET/PATCH.
    - Mapping `title ↔ subject`, `created_at ↔ opened_at`; `SupportTicket.description`, `updated_at`, `created_by` (also set by the legacy screen), optional `customer_phone`; `closed_at` follows status (reopen clears it).
    - `assignees/` — active staff, so a member without `staff.view` can still assign; deactivated assignee shows «غير نشط», stays selectable in detail with a re-assign hint (§8).
    - Migration `products/0234_support_api` (all fields above + session version + message fields).
    - BFF: `api/bff/support/[...path]` → `liveOrMock(…, "support", "/api/v1/support/<path>/", …)`; `.env.example` lists `support`; tests `api/test_support_api.py` (6).
  - **Done when**: the 11-route table is complete.
  - **Status**: written in official Step 43 (2026-10-28): `m32-support.md` §3 (the complete 11-route table) + §4.3 (filters with the `assigned_to` error, field mapping, create rules with every verbatim error, `closed_at`-follows-status with reopen, last-write-wins, `assignees/` without `staff.view` and the `assignee_active` behaviour) + §5 (migration `0234` field by field); no discrepancies.

### 1.20 Domain 15 API — Reports & analytics (التقارير والتحليلات)

The first live module (pre-Phase 002). Reports read precomputed daily metrics (`DailyStoreMetrics`, `compute_day_metrics`) and per-report builders; the dashboard «today» refresh (INT-003) shares the 5-min cooldown key; the push stats card (INT-016) lives on `/dashboard/reports`; platform rollups use public `TenantStatsSnapshot`.

- [x] **DOC-263** — Document the report registry and report data endpoints
  - **Source**: INT-027 (M25) · inventory Domain 15
  - **Output**: `docs/api/domains/15-reports/m25-reports.md`
  - **Must document**:
    - All 9 BFF rows via `liveOrMock(…, "reports", …)` → `api/views_reports.py` (`reports_contract.py`); shapes match Zod field for field.
    - The 42 registry codes/categories/order (full table); statuses — `ai_forecasting` = `coming_soon`, `whatsapp_costs` = `available` (Django has its builder), 6 disabled rows (mock + `scripts/reports-check.ts` aligned).
    - Refresh shares the 5-min cooldown with dashboard overview refresh (same cache key); permissions `reports.view` / `reports.sales.view`.
  - **Done when**: the registry table lists all 42 codes with category and status.
  - **Status**: written in official Step 28 (2026-10-27): `docs/api/domains/15-reports/m25-reports.md#registry`, `#registry-index`, `#registry-table` (all 42 codes with category, status, permission and builder: 36 `available`, 5 `not_yet_available`, 1 `coming_soon`), `#report-data`, `#refresh` (the shared 5-minute cooldown). Discrepancy: the UI permission map uses a different key than Django's `permission_code` for 20 of the 42 reports, and Django never checks `reports.view`.

- [x] **DOC-264** — Document the location dimension on order-derived reports
  - **Source**: INT-027 (M25), INT-025 · inventory Domain 15
  - **Output**: `docs/api/domains/15-reports/m25-reports.md`
  - **Must document**:
    - `sales_overview`, `orders`, `store_overview`, `best_sellers` carry `has_locations` + active `locations` when multi-location is on; other reports keep `has_locations: false` (screen drops the param, §8).
    - `?location` (id from that list, else ignored) recomputes live from the location's orders (`Order.source_location`, or a line's `OrderItem.source_location` for split orders — id subquery, no double counting) via `compute_day_metrics(day, location_id)` only for days with such orders; past days cached 1 h.
  - **Done when**: the no-double-counting rule is explained with an example.
  - **Status**: written in official Step 28 (2026-10-27): `docs/api/domains/15-reports/m25-reports.md#locations`, `#no-double-count` (`has_locations` only on the four order-derived reports, the `?location` recompute, past days cached 1 h, the split-order rule with a worked example). Observation: order-level refunds, cancellations and coupon discounts are counted in full in every location that has a line of a split order. No roadmap discrepancy.

- [x] **DOC-265** — Document report exports and schedules
  - **Source**: INT-027 (M25) · inventory Domain 15
  - **Output**: `docs/api/domains/15-reports/m25-reports.md`
  - **Must document**:
    - Export jobs (`ReportExportJobSerializer`) keep the `location` param and write EVERY table page (`export_table` stopped at the first 1000 rows); `reports.export`; `export_ready` notification to the requester (INT-009).
    - Schedules (`ScheduledReportSerializer`).
    - No migration; tests `api/test_reports_api.py` + `ReportsLocationFilterTests` (3).
  - **Done when**: export and schedule payloads are documented.
  - **Status**: written in official Step 28 (2026-10-27): `docs/api/domains/15-reports/m25-reports.md#exports`, `#export-create`, `#export-jobs`, `#export-download`, `#export-engine`, `#export-ready`, `#schedules`, `#schedule-endpoints`, `#schedule-run` (job and schedule payloads, `reports.export`, every table page written). Discrepancies: an `orders` export ignores `location` because it uses the legacy iterator (only `export_table` reports keep it); `export_ready` is created by pull-sync for both ready and failed jobs («فشل التصدير») and reaches the requester, or the owner for owner and scheduled jobs. Test count: 19 in `api/test_reports_api.py`, of which `ReportsLocationFilterTests` has the 3 the roadmap names.

### 1.21 Domain 16 API — Platform owner console (لوحة مالك المنصة `console.<base>`)

The console runs on the **public schema only** (404 on a store host or with `X-Store-Domain`) with a Django admin session (superuser = «مالك المنصة», `is_staff` = «مشرف تشغيلي» who reads everything and writes dues / Sharwa Pay only — FR-20.09). One BFF catch-all (`platform/[...path]`) goes live per row group (`platform`, `platform_money`, `platform_billing`). Store-schema reads are wrapped in savepoints; cross-store counts use one `UNION ALL` with a per-schema savepoint fallback. Every console action is recorded in `PlatformActionLog` («من نفّذ», FR-20.07).

- [x] **DOC-266** — Document console authentication and roles (`platform/auth/login|logout|me`)
  - **Source**: INT-030 (M20) · inventory Domain 16, A.4
  - **Output**: `docs/api/domains/16-platform-console/m20-console.md`
  - **Must document**:
    - Provider `tenants/console_service.py` + `api/views_platform.py` — 21 routes under `/api/v1/platform/`, public schema only; before: admin actions in `tenants/admin.py` + HTML `master-dashboard` only.
    - Django admin session on public; `ConsoleSessionAuthentication`; no session = 401 with `WWW-Authenticate: Session`; CSRF on login and every write; login answers the rotated `csrf_token`; the `(admin)` layout bootstraps CSRF like the dashboard; `getAdminSession()` reads `auth/me/` when live.
    - Lockout after 5 failures per username / 15 min; per-IP only a loose CGNAT ceiling (100).
    - Roles: superuser «مالك المنصة»; `is_staff` «مشرف تشغيلي» reads everything, writes dues/Sharwa Pay only; other writes → 403 «هذا الإجراء لمالك المنصة فقط.».
  - **Done when**: the role × capability matrix and lockout rules are documented.
  - **Status**: written in official Step 40 (2026-10-28): `docs/api/domains/16-platform-console/m20-console.md` §4.1 (role × capability matrix for the 21 M20 routes, 401/403/404 rules, lockout rules, CSRF bootstrap and rotation, `getAdminSession()`; login/logout/me payloads stay in `auth.md`; 1 diagram; 1 discrepancy: the lock applies to the 6th attempt and the window is fixed from the first failure).

- [x] **DOC-267** — Document the console overview, stores list and clients (`overview/`, `stores/`, `clients/`)
  - **Source**: INT-030 (M20), INT-032 · inventory Domain 16
  - **Output**: `docs/api/domains/16-platform-console/m20-console.md`
  - **Must document**:
    - `overview/` — sum of `TenantStatsSnapshot` like the old master dashboard; failed/stalled counts; pending top-ups/withdrawals/DLQ; last 50 stores.
    - `stores/` — `status` incl. `stalled` (sweeper thresholds pending > 5 min / provisioning > 20 min), `plan` incl. `none` (options from the M46 plans list), `is_active`, `q` name/schema/domain/phone with `0777…` local form, `ordering`, paging; screens poll on `pending`.
    - `clients/`.
  - **Done when**: every filter and the stall thresholds are documented.
  - **Status**: written in official Step 40 (2026-10-28): `docs/api/domains/16-platform-console/m20-console.md` §4.2 (`overview/`, `stores/` with every filter, `ordering`, paging, the stalled thresholds 5 min / 20 min, `clients/`; 3 discrepancies: the console UI says 30 minutes, polling also covers `provisioning`, and `total_stores` differs from the legacy dashboard).

- [x] **DOC-268** — Document store re-provisioning (`stores/reprovision/`)
  - **Source**: INT-030 (M20) · inventory Domain 16, A.8
  - **Output**: `docs/api/domains/16-platform-console/m20-console.md`
  - **Must document**:
    - Failed or stalled stores only — the admin action verbatim: status `pending` + `queue_provisioning` (→ `provision_tenant_schema`); per-store reasons returned for refused stores; mock aligned (`scripts/admin-stores-check.ts`).
  - **Done when**: request/response with per-store reasons is documented.
  - **Status**: written in official Step 40 (2026-10-28): `docs/api/domains/16-platform-console/m20-console.md` §4.3 (`stores/reprovision/` request, per-store reasons, status flip and `queue_provisioning`; 1 diagram; 1 discrepancy: the admin action re-queues any non-ready store, the console only failed or stalled ones).

- [x] **DOC-269** — Document store detail and the per-store Sharwa Ship toggle (`stores/<schema>/`, `stores/<schema>/sharwa-ship/`)
  - **Source**: INT-030 (M20) · inventory Domain 16
  - **Output**: `docs/api/domains/16-platform-console/m20-console.md`
  - **Must document**:
    - Detail: domains, current + history subscriptions, installations read from the store schema, override count, last 20 actions (`PlatformActionLog`).
    - Sharwa Ship: truth = `DeliveryMethod.is_sharwa_official` in the store schema; «قيد التفعيل/الإلغاء» = a 10-min cache marker until the real state matches; refused up front when the `sharwa_ship` feature is off for the store (the task skipped it silently).
  - **Done when**: the pending marker semantics are documented.
  - **Status**: written in official Step 40 (2026-10-28): `docs/api/domains/16-platform-console/m20-console.md` §4.4 (store detail blocks and `stores/<schema>/sharwa-ship/`, the 10-minute pending marker as a state diagram; 1 discrepancy: the up-front refusal happens only when a `sharwa_ship` Feature row exists, and answers 400).

- [x] **DOC-270** — Document per-store features, domains and deactivation
  - **Source**: INT-030 (M20) · inventory Domain 16
  - **Output**: `docs/api/domains/16-platform-console/m20-console.md`
  - **Must document**:
    - `stores/<schema>/features/` GET/PUT — `source` = the deciding step.
    - `stores/<schema>/domains/` + `domains/<id>/` — reserved-name validator, primary switch.
    - `stores/<schema>/deactivation/` GET/POST — `TenantDeactivationRecord.reinstated_at` / `actor` / `updated_at`; «إعادة التفعيل» closes the record (history kept, «أُعيد التفعيل»; the mock deleted it); waybill-issue and edge-cases banner guards filter `reinstated_at__isnull`; custody «مسوّاة» = no open shipments, no pending platform dues, zero merchant Sharwa Pay balance; close only after dues are settled; notes ≤ 255.
  - **Done when**: the deactivation/reinstatement lifecycle is diagrammed.
  - **Status**: written in official Step 40 (2026-10-28): `docs/api/domains/16-platform-console/m20-console.md` §4.5 (store features GET/PUT with `source`, domains, deactivation GET/POST with the deactivation/reinstatement lifecycle diagram and the custody check; 3 discrepancies: guards also require `closed_at` null and a suspended or deactivated status, `reason` has no 255 limit, the domain routes are POST only).

- [x] **DOC-271** — Document the feature catalogue, resolution and overrides
  - **Source**: INT-030 (M20), A.5 · inventory Domain 16
  - **Output**: `docs/api/domains/16-platform-console/m20-console.md`
  - **Must document**:
    - `features/` catalogue + PATCH (kill switch / `requires_plan` / name); `features/<code>/resolve/`.
    - Single decision source `billing.models.resolve_feature_decision` → `(enabled, decided_by)`; `_resolve_feature_enabled` takes `[0]`; the resolution steps in order (kill switch, override, plan, requires_plan with no plan ⇒ step 5 «غير متاحة»).
    - `feature-overrides/` list · `bulk/` · `<id>/` DELETE (used by the stores bulk dialog and overrides screen); `TenantFeatureOverride.updated_at`.
  - **Done when**: the resolution order is documented as an algorithm with `decided_by` values.
  - **Status**: written in official Step 40 (2026-10-28): `docs/api/domains/16-platform-console/m20-console.md` §4.6 (feature catalogue and PATCH, `resolve/`, the `resolve_feature_decision` algorithm with all six `decided_by` values, overrides list, bulk and DELETE; 2 discrepancies: override is checked before the kill switch, and «غير متاحة» is frontend text).

- [x] **DOC-272** — Document the carrier webhook dead-letter queue (`webhook-events/`, `<id>/retry|discard/`)
  - **Source**: INT-030 (M20), INT-021 · inventory Domain 16, A.8
  - **Output**: `docs/api/domains/16-platform-console/m20-console.md`
  - **Must document**:
    - `PendingWebhookEvent.resolved_at`; retry runs `process_carrier_webhook_event` synchronously with the SAME idempotency key as the receiving view (`products.tasks.shipping.carrier_idempotency_key`, used by `CarrierWebhookView`); failure bumps `attempts` and keeps it pending; discard; source filter gains `sharwa_ship`.
  - **Done when**: retry idempotency is explained.
  - **Status**: written in official Step 40 (2026-10-28): `docs/api/domains/16-platform-console/m20-console.md` §4.7 (`webhook-events/` list, retry and discard, retry idempotency explained with a sequence diagram; 2 discrepancies: the `source` filter is a free exact match, and the retry key differs from the receiving view's when the payload has neither `event_id` nor `event_time`).

- [x] **DOC-273** — Document M20 migrations, robustness, BFF wiring and tests
  - **Source**: INT-030 (M20) · A.3, A.9, A.11, A.12
  - **Output**: `docs/api/domains/16-platform-console/m20-console.md`
  - **Must document**:
    - Migrations `tenants/0027_platform_console_api` (`TenantDeactivationRecord.reinstated_at/actor/updated_at`, `PendingWebhookEvent.resolved_at`, `PlatformActionLog` read-only in admin) and `billing/0012_tenantfeatureoverride_updated_at`.
    - Every tenant-schema read wrapped in a savepoint (missing schema never poisons the request).
    - BFF catch-all `platform/[...path]` live per row group, module `platform`; `reinstated_at` in the record schema.
    - Tests: `api/test_platform_console_api.py` (14, incl. a real tenant-schema read and a missing-schema store).
  - **Done when**: the 21-route table is complete.
  - **Status**: written in official Step 40 (2026-10-28): `docs/api/domains/16-platform-console/m20-console.md` §4.8 (the complete 21-route table, migrations `tenants/0027` and `billing/0012` field by field, the savepoint matrix, `PlatformActionLog` read-only in admin, BFF key mapping, the 14 tests; 2 discrepancies: the 21-route count holds, and two M45 reads have no savepoint).

- [x] **DOC-274** — Document platform dues overview and per-store dues detail (`dues/overview/`, `dues/<schema>/`)
  - **Source**: INT-031 (M45), INT-020 · inventory Domain 16, A.6
  - **Output**: `docs/api/domains/16-platform-console/m45-dues-sharwa-pay-admin.md`
  - **Must document**:
    - Provider `tenants/console_money_service.py` + 10 routes in `api/views_platform.py`; operators may write `dues` / `sharwa_pay`, zones owner-only; before: HTML `master-dashboard/dues/` (8 POST actions) + `sharwapay/admin.py` bulk actions.
    - `dues/overview/` — `period` today/7d/30d = sum of `TenantStatsSnapshot`, latest snapshot date, merchant Sharwa Pay balances, `pending_count` from ONE `UNION ALL` across store schemas (per-schema savepoint fallback); ready + active stores, highest revenue first.
    - `dues/<schema>/` — pending commissions with `collectable`, pending + waived charges, uninvoiced billable installations for the current period with `already_generated`, installations with `expired`, per-currency totals (never summed across currencies), wallet, snapshot.
    - Dues of a suspended store stay reachable (legacy required `is_active`, which would dead-lock deactivation).
  - **Done when**: each block of the detail payload is documented.
  - **Status**: written in official Step 40 (2026-10-28): `docs/api/domains/16-platform-console/m45-dues-sharwa-pay-admin.md` (359 lines, created here because the roadmap Output for DOC-274 is the M45 page, not `m20-console.md`; `dues/overview/` and `dues/<schema>/` with every block of the payload, the suspended-store rule, 1 diagram; 1 discrepancy: `dues_detail` has no savepoint; DOC-275 → 278 are appended in Step 41).

- [x] **DOC-275** — Document dues actions (`dues/<schema>/actions/`)
  - **Source**: INT-031 (M45) · inventory Domain 16, A.7
  - **Output**: `docs/api/domains/16-platform-console/m45-dues-sharwa-pay-admin.md`
  - **Must document**:
    - Actions `collect_commission | waive_commission | collect_charge | waive_charge | unwaive_charge | generate_charge | suspend_app | reactivate_app` → `{detail, level, entry}`.
    - Legacy model methods verbatim — `.collect()` is the only debit, from the merchant's Sharwa Pay wallet; row locked first; 409 «… تم التعامل معه مسبقاً»; 400 `{detail, level:error}` with the server's money sentence.
    - Bug fixed: `generate_billing_charge` caught `IntegrityError` without a savepoint (TransactionManagementError) — now wrapped in `atomic()`.
  - **Done when**: every action code has its effect and error cases.
  - **Status**: written in official Step 41 (2026-10-28): `m45-dues-sharwa-pay-admin.md` §4.4 (per-action table with effect, verbatim `detail` and `level`; the three money sentences of `collect_platform_fee_for_merchant` verbatim; row-lock chain; the savepoint fix in §5.2; no discrepancies — code matches the roadmap).

- [x] **DOC-276** — Document Sharwa Pay top-up review (`sharwa-pay/topups/`, `<id>/approve|reject/`)
  - **Source**: INT-031 (M45), INT-048 · inventory Domain 16
  - **Output**: `docs/api/domains/16-platform-console/m45-dues-sharwa-pay-admin.md`
  - **Must document**:
    - Approve = `apply_credit_if_approved()` (`credited_at` guard — never a double credit); reject needs a note; duplicate approved bank transaction → error naming the earlier request.
    - A top-up that matched no wallet is linked on approval to the wallet of its claimed phone if that wallet exists by then — never a wallet created for an unproven number (400 otherwise).
    - Migration `sharwapay/0003_console_review_fields`: `SharwaPayTopupRequest.bank_name` / `claimed_phone` / `reviewed_by` (backfill: every bank-webhook top-up = «كريمي»; claimed phone parsed from legacy note «الرقم الوارد: X»); the Kuraimi webhook stores both.
    - Receipt rendered via `/media/…` same-origin proxy with text fallback.
    - `topup_auto` vs `topup_manual` labelling (INT-048 fix).
  - **Done when**: approve/reject bodies and the wallet-linking rule are documented.
  - **Status**: written in official Step 41 (2026-10-28): `m45-dues-sharwa-pay-admin.md` §4.5 + §5.3 (list filters and row shape, the four approve rules incl. the `credited_at` guard, wallet-linking and duplicate-transfer sentences verbatim, migration 0003 with the «كريمي»/«الرقم الوارد: X» backfill, receipt rendering, `topup_auto`/`topup_manual`; 1 fixture difference: the mock creates a wallet on approve where Django answers 400 — flagged in §6, not a code discrepancy).

- [x] **DOC-277** — Document Sharwa Pay withdrawals review and wallet lookup
  - **Source**: INT-031 (M45) · inventory Domain 16
  - **Output**: `docs/api/domains/16-platform-console/m45-dues-sharwa-pay-admin.md`
  - **Must document**:
    - `sharwa-pay/withdrawals/` + `<id>/confirm|reject/` — amount debited at request time; reject credits `withdrawal_reversal` in the same transaction; `SharwaPayWithdrawalRequest.reviewed_by`.
    - `sharwa-pay/wallets/<phone>/` — `0777…` local form accepted; last 100 movements.
  - **Done when**: the debit-at-request/reversal-on-reject model is documented.
  - **Status**: written in official Step 41 (2026-10-28): `m45-dues-sharwa-pay-admin.md` §4.6 (debit-at-request model with a sequence diagram, confirm vs reject, `withdrawal_reversal` credit in the same transaction, wallet lookup with `0777…` cleaning, `is_merchant`, last-100 movements, all seven movement reasons; no discrepancies).

- [x] **DOC-278** — Document Sharwa Ship zone administration (`sharwa-ship/zones/`, `<id>/`)
  - **Source**: INT-031 (M45), INT-021, INT-047 · inventory Domain 16
  - **Output**: `docs/api/domains/16-platform-console/m45-dues-sharwa-pay-admin.md`
  - **Must document**:
    - GET/POST + PATCH/DELETE; owner-only.
    - Code is an immutable slug referenced by issued waybills — new zones use `SAN-01`; existing ones (even legacy `sanaa_inner_city`) keep theirs; PATCH refuses a change (form locks the field and sends no code — `zoneUpdateSchema`).
    - Geo bounds optional but all-or-none (schema nullable; map skips such zones; table shows «بلا حدود»); 7-decimal coordinates.
    - BFF: catch-all routes `dues|sharwa-pay|sharwa-ship` to module `platform_money`; tests `api/test_platform_money_api.py` (7 — real tenant schema, real wallet debits).
  - **Done when**: zone code immutability and geo rules are documented.
  - **Status**: written in official Step 41 (2026-10-28): `m45-dues-sharwa-pay-admin.md` §4.7 (code immutability incl. the `^[A-Z]{3}-\d{2}$` rule and the refusal sentence, legacy `sanaa_inner_city`, `zoneUpdateSchema` sending no code, geo trio all-or-none with every validation message, 7-decimal quantize, map skip + «بلا حدود», owner-only with the operator 403 test, BFF regex; no discrepancies).

- [x] **DOC-279** — Document plans (`plans/`, `plans/<id>/`)
  - **Source**: INT-032 (M46) · inventory Domain 16
  - **Output**: `docs/api/domains/16-platform-console/m46-plans-billing.md`
  - **Must document**:
    - Provider `tenants/console_billing_service.py` + 13 routes in `api/views_platform.py`; owner-only writes, operators read; before: Django admin only (`billing/admin.py`, `appstore`, `marketing`).
    - `display_price`, `display_commission` «—» / «2.50%» / money, `current_subscriptions`.
    - `Plan.save()` keeps a single default; code fixed once created (PATCH refuses); default free plan must be free AND active (registration assigns it).
    - DELETE: 409 with `current_subscriptions` when current subscribers exist; 409 «عطّلها بدل الحذف» when only historical ones exist (`Subscription.plan` PROTECT).
  - **Done when**: create/update/delete rules have example errors.
  - **Status**: written in official Step 41 (2026-10-28): `m46-plans-billing.md` §4.1 (row shape with the three `display_commission` forms, full field/validation table with every error sentence, single-default `Plan.save()`, fixed code, free-and-active default rule, both DELETE refusals with verbatim details; no discrepancies).

- [x] **DOC-280** — Document the plan × feature matrix and subscriptions (`plan-features/`, `subscriptions/`, `subscriptions/assign/`)
  - **Source**: INT-032 (M46) · inventory Domain 16
  - **Output**: `docs/api/domains/16-platform-console/m46-plans-billing.md`
  - **Must document**:
    - `plan-features/` GET/PUT — one cell, `update_or_create`.
    - `subscriptions/` (`schema|status|current|plan|q`, paged); `assign/` — `Subscription.assign_plan` is the only assignment point; the previous current subscription is marked `cancelled` with its date (no longer «active» off-current); `current_period_end` date → end of day; notes ≤ 255.
  - **Done when**: the assignment side effects are documented.
  - **Status**: written in official Step 41 (2026-10-28): `m46-plans-billing.md` §4.2 (matrix GET/PUT one cell via `update_or_create`, all six subscription filters, `assign_plan` as the only point with the two side effects spelled out — previous current active row → `cancelled` + `cancelled_at`, `is_current` flip — end-of-day period end, notes 255; no discrepancies).

- [x] **DOC-281** — Document billing settings and the auto-assignment of the free plan (`billing-settings/`)
  - **Source**: INT-032 (M46), A.5 · inventory Domain 16
  - **Output**: `docs/api/domains/16-platform-console/m46-plans-billing.md`
  - **Must document**:
    - GET/PATCH; `stores_without_subscription` counts ready stores with no current plan.
    - Gap closed: enabling plans now assigns the active default free plan to every ready store without one in the same transaction (note «إسناد تلقائي عند تفعيل الباقات»); 400 when no active default free plan exists (before, the gate would instantly deny every `requires_plan` feature; old help text «لا يؤثر بأثر رجعي»).
  - **Done when**: the enable-plans transaction is documented with its precondition.
  - **Status**: written in official Step 41 (2026-10-28): `m46-plans-billing.md` §4.3 + §5 (payload, singleton lock, the enable transaction as a sequence diagram with the «لا باقة مجانية افتراضية نشطة — أنشئها أولاً.» precondition, the «إسناد تلقائي عند تفعيل الباقات» note, old «لا يؤثر بأثر رجعي» help text quoted; 1 open item: that stale help text is still on the model).

- [x] **DOC-282** — Document platform apps and app billing overrides (`apps/`, `apps/<code>/`, `app-billing-overrides/`)
  - **Source**: INT-032 (M46), INT-040 · inventory Domain 16
  - **Output**: `docs/api/domains/16-platform-console/m46-plans-billing.md`
  - **Must document**:
    - `apps/` GET/POST · `<code>/` PATCH — code fixed; `installations` from ONE `UNION ALL` count over every ready store schema with per-schema savepoint fallback; `App.icon_name` (migration `appstore/0007_app_icon_name`; names an icon from the UI library, no brand marks; legacy `icon` image kept for old templates).
    - `app-billing-overrides/` GET/POST · `<id>/` DELETE — one per app × store; consumed by `App.is_billed_for_client`.
  - **Done when**: icon naming and override uniqueness are documented.
  - **Status**: written in official Step 41 (2026-10-28): `m46-plans-billing.md` §4.4 (catalogue row with `icon_name` naming + validation sentence and the legacy image column note, the UNION ALL installation counter with its savepoint fallback, `is_billed_for_client`'s three-step algorithm, override uniqueness with both refusal paths; no discrepancies).

- [x] **DOC-283** — Document market categories (`market-categories/`, `reorder/`, `<id>/`)
  - **Source**: INT-032 (M46), INT-004 · inventory Domain 16
  - **Output**: `docs/api/domains/16-platform-console/m46-plans-billing.md`
  - **Must document**:
    - GET/POST · `reorder/` (full id set) · `<id>/` PATCH/DELETE; `stores_count` = stores that ticked it at registration (onboarding `market-categories`, INT-004); a used category → 409 «عطّلها بدل الحذف».
    - BFF: catch-all routes M46 rows to module `platform_billing` (every console row now has a Django provider); notes limits 255; mock aligned (fixed plan code, PROTECT on historical subscriptions, active default plan, icon names).
    - Tests: `api/test_platform_billing_api.py` (7, incl. a real tenant-schema installation count).
  - **Done when**: the 13-route M46 table is complete.
  - **Status**: written in official Step 41 (2026-10-28): `m46-plans-billing.md` §4.5 + §3 (the complete 13-route table, `stores_count` from `interested_categories` tied to the INT-004 onboarding tick + the public list route, full-id-set reorder, «عطّلها بدل الحذف» refusal, BFF `platform_billing` regex, notes 255 limits, mock alignment, the 7 tests incl. `InstallationCountTests`; no discrepancies).

---

## Track 2 — Merchant, Staff, Buyer, Courier, Sharwa Pay & Platform Admin User Manuals

> Arabic (RTL) task-oriented manuals for every screen and workflow, per audience and role/permission. Output: `docs/guides/`.

### 2.1 Manual framework (إطار الأدلة)
Shared foundations every Arabic guide depends on: style, glossary, screenshots, permission and plan matrices, troubleshooting and money display.

- [x] **DOC-284** — Write the Arabic user-guide style guide and UI glossary
  - **Source**: all INT tasks (INT-001…INT-049) · inventory header conventions («…» = exact server/UI sentences), A.4, A.5
  - **Audience**: guide writers (all audiences)
  - **Output**: `docs/guides/_style-guide.md` + `docs/guides/_glossary.md` (Arabic, RTL)
  - **Must cover**:
    - RTL markdown rules, how to quote UI labels and server messages exactly as «…» (copied verbatim from the inventory/UI, never paraphrased), numbering of steps, callout boxes (تنبيه / ملاحظة / قيد معروف).
    - Glossary of every recurring term with its Arabic UI label: مالك المتجر، عضو فريق (staff)، مدير المتجر، مدير الفرع، الكاشير، المندوب، مالك المنصة، مشرف تشغيلي، الباقة، الميزة، الصلاحية، المحفظة (merchant wallet vs customer wallet vs Sharwa Pay wallet — three different wallets), النقاط، الطلب، الشحنة، البوليصة (AWB/waybill)، الوردية، العهدة (custody)، الموقع/الفرع، الحجز، المزاد، الحزمة (bundle)، الدروبشيبينغ، القناة، صندوق الوارد.
    - Audience folder map (`merchant/`, `buyer/`, `courier/`, `sharwa-pay/`, `console/`) and the 16 domain slugs.
    - Rule: user guides describe behaviour, never internal file names; "known limitation" boxes come from inventory A.13 phrased for users.
  - **Screenshots**: none
  - **Done when**: style guide + glossary reviewed by fares and every later guide links the glossary.
  - **Status**: style guide and glossary written in official Step 10 (2026-10-27): `docs/guides/_style-guide.md` (RTL rules, verbatim «…» quoting, numbered steps, the three callout boxes, A.13 limitations phrased for users with the guide that carries each, money and numbers, audience folder map and the 16 domain slugs, the submission checklist) and `docs/guides/_glossary.md` (every listed term with its UI label checked in the code; the UI says «موظف» not «عضو فريق», «المحادثات»/«صندوق المحادثات» not «صندوق الوارد», «المناوبة» for couriers vs «الوردية» for POS, «محفظة المتجر» for the merchant wallet). **Left open**: Done-when needs fares's review, and later guides must link the glossary. **Closed in official Step 52 (2026-10-30)**: fares reviewed and approved the style guide and the glossary (both pages now say «معتمد»); every guide links the glossary, and `docs/glossary.md` adopted 23 of its UI labels (DOC-534).

- [x] **DOC-285** — Build the screenshot pipeline for the guides from the mock E2E scripts
  - **Source**: A.2 (mock runtime), A.12 (mock E2E scripts), INT-045 (`caret: "initial"`), INT-044 (`requireMocks()`)
  - **Audience**: guide writers
  - **Output**: `docs/guides/_screenshots.md` + `docs/guides/_assets/` (captured images)
  - **Must cover**:
    - Run the dev server with mocks only: Windows cmd `set SHARWA_LIVE_MODULES=none&& npm run dev` (note `set X=` deletes the variable), confirm every response carries `x-sharwa-mock: 1` (the `requireMocks()` preflight pattern of `scripts/b2b-check.ts`).
    - Reuse the Playwright scripts `scripts/*-check.ts` (admin-stores, reports, marketplaces, dropshipping, expenses, b2b, bundles, sharwa-ship, sharwa-pay, rollup + per-module scripts) to reach each screen and capture images; use `caret: "initial"` to avoid the inline caret-color hydration warning.
    - Capture both desktop and mobile widths (mobile bottom nav, e.g. the expenses «مصروف جديد» bar above the bottom nav).
    - Naming convention per domain/screen; mask any phone numbers/tokens; re-capture policy when the UI changes (enterprise navy/blue theme).
  - **Screenshots**: n/a (this task defines how)
  - **Done when**: one command regenerates every guide image from mocks.
  - **Status**: written in official Step 10 (2026-10-27): `docs/guides/_screenshots.md` + `scripts/guide-screenshots.ts` + `docs/guides/_assets/shots.json`. One command (`npx tsx scripts/guide-screenshots.ts`, dev server in mock mode) regenerates every guide image: `requireMocks()` preflight (`x-sharwa-mock: 1`), desktop 1440 and mobile 390, phones and `shw_pat_` tokens masked, dev badge and Next indicator hidden, `caret: "initial"`, one recipe (`order-conflict`). Run in a cloud clone of the pushed repo: 9 images captured, `eslint` and `tsc --noEmit` clean. Roadmap says reuse the `*-check.ts` scripts / they assert and mutate state and write design evidence to `docs/visual-checks/`, so the pipeline is a separate manifest that reuses their conventions. Mock money strings differ from Django `format_money` (call-out).

- [x] **DOC-286** — Publish the roles & permissions matrix page («من يستطيع ماذا»)
  - **Source**: A.5 (M18 permission keys, owner-only areas), INT-022, INT-043, INT-033, INT-044, INT-035, INT-024, INT-008, INT-017
  - **Audience**: owner, staff managers
  - **Output**: `docs/guides/merchant/12-settings-staff-integrations/permissions-matrix.md`
  - **Must cover**:
    - Every M18 key with an Arabic explanation of what it unlocks: `orders.view`, `orders.update_status`, `orders.process_returns`, `orders.refund`, `orders.create_b2b`, `orders.approve_b2b`, `customers.view`, `customers.edit_profile`, `catalog.manage`, `discounts.apply`, `discounts.manage`, `inventory.view`, `inventory.adjust`, `inventory.writeoff`, `reports.view`, `reports.sales.view`, `reports.export`, `staff.view`, `staff.manage`, `staff.manage_roles`, `staff.manage_assignments`, `staff.view_sessions`, `suppliers.manage`, `suppliers.approve`, `channels.inbox.access`, `channels.marketplaces.manage`, `channels.dropshipping.manage`, `support.takeover_session`, `expenses.manage` (category «المالية»).
    - The owner implicitly holds every key; default holders (e.g. `catalog.manage` = owner + «مدير المتجر» + «مدير الفرع»; `expenses.manage` seeded to «مدير المتجر» + «مدير الفرع», re-assignable from «الأدوار والصلاحيات»); system roles are read-only.
    - Role-based extras: `Role.max_discount_percent` (POS discount ceiling), approver roles on approval requests, «مدير الفرع|المتجر» for POS variance.
    - Full owner-only list: store settings money/structure sections, design (M08), carts/campaigns/timeline/loyalty/gifting (M13), payments & merchant wallet (M14), shipping settings (M15), locations structure (M22), domains & integrations (M19), affiliate/influencer writes (M17), channel settings (M27), app installs + template edits (M30), Sharwa AI writes/console (M31), Sharwa Ship writes + supervision (M39), multi-store rollup (M43), push broadcast (M44).
    - Mixed rules: search results trimmed by permission (orders need `orders.view`, customers need `customers.view`); audit log = `staff.view_sessions` OR `reports.sales.view`; inbox per-channel `StaffChannelAccess`; sidebar entries accept any-of permission lists (e.g. `suppliers.approve`-only staff see «أوامر الشراء»).
  - **Screenshots**: «الأدوار والصلاحيات» screen, a staff effective-permissions view
  - **Done when**: every key in A.5 appears with its screens and default holders.
  - **Status**: written in official Step 10 (2026-10-27): `docs/guides/merchant/12-settings-staff-integrations/permissions-matrix.md` — all 36 seeded keys (not 29) with Django's Arabic names, screens and default holders, the four system roles, role extras, approval and POS-variance rules, mixed rules and the full owner-only list with each sentence; 2 screenshots. Confirmed against all 239 products migrations: «مدير المتجر»/«مدير الفرع» hold 29 keys, the seven report/supplier keys belong to no seeded role.

- [x] **DOC-287** — Publish the plan-features page «ما المتاح في باقتي»
  - **Source**: A.5 (plan features), INT-032, INT-033, INT-030
  - **Audience**: owner
  - **Output**: `docs/guides/merchant/02-dashboard-shell/plan-features.md`
  - **Must cover**:
    - Each plan feature, the screens it opens, and what the merchant sees when it is off: `contact_info`, `store_policies`, `shipping_settings`, `currency_settings`, `seo_settings`, `coupon`, `multi_location`, `storefront_design`, `abandoned_carts`, `campaigns`, `timeline`, `loyalty_settings`, `gift_settings`, `payment_gateways`, `local_wallets`, `bank_transfers`, `merchantwallet`, `shipping_companies`, `pickuplocation`, `shipping_providers`, `staff_rbac`, `tracking_tools`, `inventory`, `refunds`, `customer_wallets`, `pos`, `social_channels`, `marketplaces`, `dropshipping`, `app_marketplace`, `bookings`, `sharwa_ship`.
    - Areas with no plan feature (always available): dues and «at least one payment method» settings, procurement (suppliers & POs), support, expenses.
    - POS is subscription-gated (`requires_plan`) but open to everyone while subscriptions are off; when the platform turns plans on, stores without a plan automatically get the default free plan («إسناد تلقائي عند تفعيل الباقات»).
    - Example messages: «ميزة الأسواق الإلكترونية غير مفعّلة في خطتك.», «ميزة الحجوزات غير مفعّلة في خطتك.», «ميزة شروة شيب غير مفعّلة لمتجرك.»; the platform may also override a feature for one store.
  - **Screenshots**: a disabled-feature screen, the plans section of the landing page
  - **Done when**: every feature code in A.5 is listed with its Arabic screen names.
  - **Status**: written in official Step 10 (2026-10-27): `docs/guides/merchant/02-dashboard-shell/plan-features.md` — all 40 codes (not 32) with the platform's Arabic name, sidebar screens, the server sentence when off and the default state (five off by default), always-available areas, POS and the console auto-assign; 2 screenshots. The landing page shows no plans section (hero only, owner direction 2026-10-17), so that screenshot does not exist. Auto-assign happens only through the console route, not the legacy Django admin.

- [x] **DOC-288** — Write the troubleshooting page «لماذا تظهر لي رسالة منع؟» (401/403/409/429)
  - **Source**: A.5 (gate order), A.4 (sessions/CSRF), A.7 (conflicts), INT-003, INT-022, INT-016, INT-029, INT-048
  - **Audience**: owner, staff, buyer
  - **Output**: `docs/guides/merchant/02-dashboard-shell/troubleshooting-access.md`
  - **Must cover**:
    - The check order in plain words: logged in? → feature in your plan? → your permission? → owner-only? → item state (not found / already changed).
    - Session expired / logged out → sign in again; the page refreshes its security token automatically once (CSRF) — if the error persists, reload.
    - «Someone else changed this» conflicts (orders, theme, returns, POS shift, purchase orders «حُدِّث الأمر من مستخدم آخر.», support sessions): reload and repeat.
    - Too many attempts (429): wait for the time shown (Retry-After); phone-based limits instead of strict IP limits (shared mobile internet / CGNAT).
    - Owner-only message examples («هذه الصفحة لمالك المتجر فقط.», «تصميم المتجر مقصور على مالك المتجر.», «إعدادات الشحن مقصورة على مالك المتجر.», «إدارة المواقع مقصورة على مالك المتجر.», «إعدادات القنوات لمالك المتجر فقط.», «هذا الإجراء مقصور على مالك المتجر.»).
    - A store that is still being set up or deactivated shows a provisioning/unavailable page.
  - **Screenshots**: a 403 feature-disabled state, a conflict toast
  - **Done when**: each status family has a symptom → cause → fix row.
  - **Status**: written in official Step 10 (2026-10-27): `docs/guides/merchant/02-dashboard-shell/troubleshooting-access.md` — the check order, then symptom → cause → fix tables for 401 (and the automatic CSRF retry), 403 plan feature, 403 permission, 403 owner-only, 409 conflicts, 429 (with the CGNAT reason) and the provisioning/unavailable store pages; 3 screenshots. The orders conflict is an inline panel, not a toast.

- [x] **DOC-289** — Write the money & currencies page «كيف تُعرض المبالغ»
  - **Source**: A.6, INT-010, INT-012, INT-013, INT-020, INT-033, INT-034, INT-039, INT-043, INT-048
  - **Audience**: owner, staff, buyer
  - **Output**: `docs/guides/merchant/08-finance/money-display.md`
  - **Must cover**:
    - The four currencies and labels: SAR (ر.س), USD ($), «ريال يمني (صنعاء)» YER_OLD, «ريال يمني (عدن)» YER_NEW; formatting examples «1,250 ر.س», «12.50 ر.س», «$12.50», Yemeni riyal rounded to whole numbers «… ر.ي».
    - Totals are always shown per currency and never added across currencies (e.g. dues «2.50 ر.س · $1», expenses month totals, Sharwa Pay four balances).
    - Where conversion happens: the storefront converts prices to the buyer's chosen currency; the free-shipping threshold is compared in the dashboard currency; FX rates accept 4 decimals (e.g. 3.7525) with a preview for 100 SAR; POS converts to the store currency; dropshipping uses the store's USD→SAR rate as «اليومي»; affiliate amounts are stored in SAR and shown in the store currency; the customer wallet is always SAR.
  - **Screenshots**: settings currency section with FX preview, a per-currency totals row
  - **Done when**: every conversion rule of A.6 is explained with an example.
  - **Status**: written in official Step 10 (2026-10-27): `docs/guides/merchant/08-finance/money-display.md` — the four currencies and their formats, per-currency totals (dues, expenses, Sharwa Pay, courier custody), display currency and the three rates with the 100 SAR preview, and a conversion table for every module of A.6 with examples; 2 screenshots. The free-shipping threshold is converted into the cart currency (not the subtotal into the dashboard currency); the dropshipping «daily» rate is the stored rate (already reported in Step 04).

### 2.2 Getting started (البدء: الصفحة الترويجية، التسجيل، الدخول، اللوحة)
Domains 1–2 — from the public landing page to the daily dashboard.

- [x] **DOC-290** — Document the public landing page, plans and stats
  - **Source**: INT-001 (M01) · inventory Domain 1
  - **Audience**: prospective merchant
  - **Output**: `docs/guides/merchant/01-public-onboarding/landing-and-plans.md`
  - **Must cover**:
    - Reading the plans table (live plans and prices from the platform, free-plan highlights shown when a plan lists no features) and the public stats (refreshed hourly).
    - The call-to-action into the registration wizard.
  - **Screenshots**: `/` hero, plans section, stats
  - **Done when**: a newcomer can compare plans and start registration from the page.
  - **Status**: written in official Step 14 (2026-10-27): `docs/guides/merchant/01-public-onboarding/landing-and-plans.md` — what the landing page shows (header, hero, «أنشئ متجرك الآن مجاناً», feature carousel) and «دخول التاجر» with every message. **Left open (roadmap vs code)**: the page mounts only the hero — no plans table and no stats section are rendered today, so those bullets are recorded as a known limitation, not documented as UI. Screenshots registered in `docs/guides/_assets/shots.json` but not captured (no shell on the device) — run `npx tsx scripts/guide-screenshots.ts --only merchant/01` / `--only merchant/02` in mock mode.

- [x] **DOC-291** — Document the onboarding wizard: store details, market categories and subdomain
  - **Source**: INT-004 (M02), INT-002 (M47) · inventory Domain 1
  - **Audience**: prospective merchant (future owner)
  - **Output**: `docs/guides/merchant/01-public-onboarding/register-store.md`
  - **Must cover**:
    - Each wizard panel and field; choosing market categories (managed by the platform; the store ticks them at registration).
    - Subdomain rules: 3–50 characters, availability check, reserved names refused; field-level errors shown under the field.
    - What WhatsApp number is used for (owner login + OTP).
  - **Screenshots**: wizard panel 01, subdomain availability states
  - **Done when**: every field and validation message of the wizard is explained.
  - **Status**: written in official Step 14 (2026-10-27): `register-store.md` — every field, the in-field subdomain states, «القطاعات», terms, every server message, what the WhatsApp number is used for, send limits. Screenshots registered in `docs/guides/_assets/shots.json` but not captured (no shell on the device) — run `npx tsx scripts/guide-screenshots.ts --only merchant/01` / `--only merchant/02` in mock mode.

- [x] **DOC-292** — Document OTP verification, resend, expiry and rate limits in onboarding
  - **Source**: INT-004 (M02) · inventory Domain 1
  - **Audience**: prospective merchant
  - **Output**: `docs/guides/merchant/01-public-onboarding/verify-otp.md`
  - **Must cover**:
    - Entering the WhatsApp code; wrong code message; resend.
    - A pending registration expires after 30 minutes: a resend then returns the user to panel 01 with their entered data kept (no dead end) — re-submit.
    - Too many attempts → wait the displayed time (429 with Retry-After); WhatsApp delivery failure (502) → try again later.
  - **Screenshots**: OTP form, expired state returning to panel 01
  - **Done when**: every OTP outcome (ok, invalid, 410 expired, 429, 502) has user instructions.
  - **Status**: written in official Step 14 (2026-10-27): `verify-otp.md` — entering the code, resend, wrong code, lock (429), expired code (410), expired draft returning to panel 01, WhatsApp failure, network error, limits table. The expired-state screenshot is not scriptable in mock mode (left open). Screenshots registered in `docs/guides/_assets/shots.json` but not captured (no shell on the device) — run `npx tsx scripts/guide-screenshots.ts --only merchant/01` / `--only merchant/02` in mock mode.

- [x] **DOC-293** — Document store provisioning status and the first-password setup link
  - **Source**: INT-002 (M47), INT-004, INT-003 · inventory Domain 1, A.4
  - **Audience**: new owner
  - **Output**: `docs/guides/merchant/01-public-onboarding/provisioning-and-first-password.md`
  - **Must cover**:
    - The provisioning status page while the store is being created; what «stalled/failed» means (the platform can re-provision it).
    - The dashboard link carries a short-lived signed setup token so only the registrant can set the first password; what to do if it expires.
    - Store-not-found / not-ready / unavailable pages a visitor might see (404/403/503 from tenant resolution).
    - A newly ready store with no content gets a «provisioning_notice» notification guiding first steps.
  - **Screenshots**: provisioning status page, setup-password page
  - **Done when**: a new owner knows each provisioning state and how to set the first password.
  - **Status**: written in official Step 14 (2026-10-27): `provisioning-and-first-password.md` — every wait-page state (waiting, slow, reconnecting, ready, failed, not found), the 1-hour setup link, first password rules and messages, the three visitor pages, the «متجرك جاهز» notification. Code-vs-code findings reported (failed-store promise, expired-link dead end). Screenshots registered in `docs/guides/_assets/shots.json` but not captured (no shell on the device) — run `npx tsx scripts/guide-screenshots.ts --only merchant/01` / `--only merchant/02` in mock mode.

- [x] **DOC-294** — Document owner login, logout and forgot/reset password
  - **Source**: INT-003 (M03) · inventory Domain 2, A.4
  - **Audience**: owner
  - **Output**: `docs/guides/merchant/02-dashboard-shell/owner-login.md`
  - **Must cover**:
    - Login with the store's WhatsApp phone + password; the session is bound to this store (it cannot be used to switch into another store's dashboard).
    - Forgot password: a WhatsApp code is sent to the store number; max 3 sends per 10 minutes; locked after 3 wrong codes; then set a new password.
    - Logout.
  - **Screenshots**: login, forgot-password, reset-password
  - **Done when**: every step and limit of owner auth is documented.
  - **Status**: written in official Step 14 (2026-10-27): `docs/guides/merchant/02-dashboard-shell/owner-login.md` — login, store-bound session, logout, forgot/reset with every message and limit, known limitation on other sessions. Screenshots registered in `docs/guides/_assets/shots.json` but not captured (no shell on the device) — run `npx tsx scripts/guide-screenshots.ts --only merchant/01` / `--only merchant/02` in mock mode.

- [x] **DOC-295** — Document staff login, lockout and roster hours
  - **Source**: INT-003, INT-022 (M18) · inventory Domain 2, Domain 12
  - **Audience**: staff
  - **Output**: `docs/guides/merchant/02-dashboard-shell/staff-login.md`
  - **Must cover**:
    - Staff sign in with phone + password (any number form accepted: 967…/0…/local); the temporary password given once by the owner and how to get a new one («كلمة مرور مؤقتة جديدة» ends all sessions).
    - 15-minute lockout after repeated failures.
    - Login refused outside the weekly roster (store timezone, week starts Sunday; no roster = no restriction).
    - Device label shown in sessions («Chrome · Android»); a terminated member cannot sign in.
  - **Screenshots**: staff login, lockout message
  - **Done when**: staff know how to sign in and why a login may be refused.
  - **Status**: written in official Step 14 (2026-10-27): `staff-login.md` — sign-in, temporary password and «كلمة مرور مؤقتة جديدة», lockout, inactive/terminated, roster rules, device label. The lockout screenshot is not possible in mock mode (left open). Empty-roster contradiction (UI says no access, Django allows) reported. Screenshots registered in `docs/guides/_assets/shots.json` but not captured (no shell on the device) — run `npx tsx scripts/guide-screenshots.ts --only merchant/01` / `--only merchant/02` in mock mode.

- [x] **DOC-296** — Document the dashboard overview, counters and the «تحديث» refresh
  - **Source**: INT-003 (M03), INT-027 · inventory Domain 2, Domain 15
  - **Audience**: owner, staff (`reports.sales.view` for refresh)
  - **Output**: `docs/guides/merchant/02-dashboard-shell/overview.md`
  - **Must cover**:
    - The «today» figures (daily store metrics), sidebar counters, low-stock count.
    - Refresh shares a 5-minute cooldown with the reports refresh; staff need `reports.sales.view` to refresh; blocks hidden/zeroed for staff without the related permission.
    - Navigation shell: sidebar, topbar, mobile bottom nav.
  - **Screenshots**: `/dashboard` overview desktop + mobile
  - **Done when**: each overview card's meaning and permission is documented.
  - **Status**: written in official Step 14 (2026-10-27): `overview.md` — every block with its permission, the six figures, «يحتاج تدخلك», refresh and its shared 5-minute cooldown, the four sidebar counters, sidebar/topbar/bottom bar, shortcuts. Screenshots registered in `docs/guides/_assets/shots.json` but not captured (no shell on the device) — run `npx tsx scripts/guide-screenshots.ts --only merchant/01` / `--only merchant/02` in mock mode.

- [x] **DOC-297** — Document the ⌘K command palette (search)
  - **Source**: INT-008 (M48) · inventory Domain 2
  - **Audience**: owner, staff
  - **Output**: `docs/guides/merchant/02-dashboard-shell/command-palette.md`
  - **Must cover**:
    - Open with ⌘K / Ctrl+K; type at least 2 characters; up to 5 results per group (max 10).
    - Arabic-insensitive matching (hamza/alef/taa marbuta/yaa variants and diacritics normalised).
    - Results: orders (need `orders.view`), customers (need `customers.view`, grouped by phone, name from latest order), products (any member; archived last), pages and actions (from the dashboard's own index), linked stores switcher.
  - **Screenshots**: palette open with mixed results
  - **Done when**: users know what is searchable and why some groups may be missing.
  - **Status**: written in official Step 14 (2026-10-27): `command-palette.md` — opening, 2-character minimum, 5 per group, Arabic normalisation, every group with its permission, quick actions, order commands, messages. Screenshots registered in `docs/guides/_assets/shots.json` but not captured (no shell on the device) — run `npx tsx scripts/guide-screenshots.ts --only merchant/01` / `--only merchant/02` in mock mode.

- [x] **DOC-298** — Document the notification center (bell) and every notification kind
  - **Source**: INT-009 (M49) · inventory Domain 2
  - **Audience**: owner, staff
  - **Output**: `docs/guides/merchant/02-dashboard-shell/notifications.md`
  - **Must cover**:
    - Kinds and who receives them: new order (status new, 72 h), payment review (awaiting_payment / payment_review), pending approval (approver role only), behaviour alert (warning/critical), unread inbox (reopens on new messages), low stock, sync failed (marketplace + supplier jobs), AWB failed, export ready (requester only), billing notice (suspended / expiring within 7 days), provisioning notice (empty ready store).
    - Stateful notifications resolve automatically when their cause is fixed (so the bell matches the sidebar) and reopen if it returns.
    - Read state is per person (owner and each staff independently); «تعليم الكل كمقروء»; the panel shows 30 days, the full page shows history; unread system notices pinned.
    - Links open the real screens (`/dashboard/staff/alerts`, `/channels/marketplaces/jobs`, `/reports/exports`); new notifications may take up to ~20 seconds to appear.
  - **Screenshots**: bell panel, full notifications page
  - **Done when**: each kind has its trigger, audience and resolution explained.
  - **Status**: written in official Step 14 (2026-10-27): `notifications.md` — every kind with trigger, audience, resolution and link; per-person reads, auto-resolve and reopen, 30-day panel, filters, messages, limits. **Left open (roadmap vs code)**: there is no full notifications/history page in the dashboard. Screenshots registered in `docs/guides/_assets/shots.json` but not captured (no shell on the device) — run `npx tsx scripts/guide-screenshots.ts --only merchant/01` / `--only merchant/02` in mock mode.

- [x] **DOC-299** — Document «متاجري» multi-store rollup and the store switcher
  - **Source**: INT-049 (M43), INT-003 · inventory Domain 2
  - **Audience**: owner (staff get «هذه الصفحة لمالك المتجر فقط.»)
  - **Output**: `docs/guides/merchant/02-dashboard-shell/my-stores.md`
  - **Must cover**:
    - Which stores appear: those linked to the merchant account linked to the current store; not linked → empty state with zero totals.
    - Date range (default last 30 days in store timezone; reversed dates swapped; applied range shown).
    - Per store: orders, completed, refunded, revenue (SAR, server formatted), last snapshot date (latest overall), available flag (active and ready — numbers still shown when unavailable); sorted by revenue then name; totals row.
    - Topbar store switcher and ⌘K use the same list; switching requires signing in to the other store.
  - **Screenshots**: «متاجري» page, topbar switcher
  - **Done when**: owners understand every column and the account-linking rule.
  - **Status**: written in official Step 14 (2026-10-27): `my-stores.md` — which stores appear, range rules, every column, totals, empty state, owner-only rule, topbar switcher and ⌘K, switching requires signing in to the other store. Screenshots registered in `docs/guides/_assets/shots.json` but not captured (no shell on the device) — run `npx tsx scripts/guide-screenshots.ts --only merchant/01` / `--only merchant/02` in mock mode.

### 2.3 Catalog (الكتالوج والمنتجات المتقدمة)
Domain 3 plus the catalog parts of Domain 9 — everything a merchant does to build the product catalogue.

- [x] **DOC-300** — Document adding a product with the card-based editor
  - **Source**: INT-005 (M04) · inventory Domain 3
  - **Audience**: owner, staff with `catalog.manage`
  - **Output**: `docs/guides/merchant/03-catalog/add-product.md`
  - **Must cover**:
    - The single scrollable page of cards: Basic Info, Media, Organization & Template, Variants & Pricing (driven by the selected template's attributes), collapsible Shipping and SEO; publish status sidebar; sticky Save/Cancel footer.
    - Mandatory fields only (red asterisk): title, base price, category/template, unit; everything else optional; Save is never disabled — clicking it while invalid highlights missing fields with Arabic messages.
    - Sectors/templates/attributes come from the platform's central dictionary; min/max quantities accept decimals (weight/length).
    - Image upload limits (requests bounded by 8 MB); the gallery is the single image model.
  - **Screenshots**: `/dashboard/products/new` full page, invalid-save highlight
  - **Done when**: a merchant can create a valid product from the guide alone.
  - **Status**: written in official Step 29 (2026-10-28): `add-product.md` — the single page of cards (Basic Info, Media, Organization & Template, Variants & Pricing driven by the template's attributes, collapsible Shipping and SEO, publish-status side card, sticky Save/Cancel), the four mandatory fields with red asterisks, every optional field, Save never disabled with the missing-field summary and red highlights, central sectors/templates/attributes, decimal min/max quantities, 5 MB per image sent one request at a time under the 8 MB request bound, the single gallery, local draft and leave guard. Discrepancies: a template is never mandatory (name, price, category, unit are); the editor's images are 5 MB multipart files, 8 MB is the request bound.

- [x] **DOC-301** — Document editing products, stock and variants
  - **Source**: INT-005 (M04), INT-024 · inventory Domain 3
  - **Audience**: owner, `catalog.manage`
  - **Output**: `docs/guides/merchant/03-catalog/edit-product-and-variants.md`
  - **Must cover**:
    - Variants and their SKUs (`<sku>-<n>`), product stock = sum of variant stock.
    - Stock is only sent when you edit it (so backorder and variant/serial/location products are not reset); serialized/location products manage stock elsewhere (inventory / serials / locations).
    - Removing a variant or attribute that has dependencies is refused with a clear Arabic message (data integrity).
    - Change log of edits; «تطبيق على منتجات» (apply to several products) behaviour.
    - Products list: filters, bulk actions, archive (archived products sort last in search).
  - **Screenshots**: product list, variants card, change log
  - **Done when**: every edit rule above is explained with its message.
  - **Status**: written in official Step 29 (2026-10-28): `edit-product-and-variants.md` — list filters, number strip, in-place price/stock with every lock reason, bulk actions and their refusal reasons, archive vs delete, variants (generation keeps existing rows, SKU `<sku>-<n>`, product stock = sum of variants, all-or-nothing save), stock sent only when edited and the four places stock lives elsewhere, the 409 messages and blocking reasons, the change log, «تطبيق على منتجات». Discrepancies: «archived last» is the command-palette search, not the list search; «تطبيق على منتجات» is one PATCH per product (partial success possible).

- [x] **DOC-302** — Document catalog organization: categories, brands, tags, collections, badges
  - **Source**: INT-006 (M05) · inventory Domain 3
  - **Audience**: owner, `catalog.manage`
  - **Output**: `docs/guides/merchant/03-catalog/organization.md`
  - **Must cover**:
    - Categories and sub-categories; drag-and-drop order applies globally (storefront menus too); category images shown on the storefront.
    - Brands; tags and merging tags; collections (add products, reorder, remove); badges (name + colour, shown on product cards).
    - Edits require `catalog.manage` (owner, «مدير المتجر», «مدير الفرع»).
  - **Screenshots**: each organization tab, drag reorder
  - **Done when**: each of the five entities has create/edit/delete/reorder steps.
  - **Status**: written in official Step 29 (2026-10-28): `organization.md` — the «التنظيم والاكتشاف» screen and its five tabs; categories (create, sub-category, edit, drag/keyboard reorder and nesting, global order incl. storefront menus, category image on the home strip, delete with product reassignment and child lift, 5-second undo); brands; tags (rename in place, «غير مستخدم», merge); collections (add, drag order, remove, archived members, copy link); badges (colour, contrast, dynamic badges); `catalog.manage` (owner, «مدير المتجر», «مدير الفرع»). Discrepancy: the storefront card shows manual badges only (already reported in step 08).

- [x] **DOC-303** — Document bundles (الحزم) and compatibility rules
  - **Source**: INT-045 (M37) · inventory Domain 3
  - **Audience**: owner, `catalog.manage` (view with `inventory.view`)
  - **Output**: `docs/guides/merchant/03-catalog/bundles-and-compatibility.md`
  - **Must cover**:
    - Adding/editing/removing bundle components, mandatory vs optional, build fee; bundle total = mandatory components converted to the bundle's currency + build fee; the storefront shows the first unavailable mandatory component.
    - Compatibility rules with operators equals · not_equals · in, comparing to a second attribute or a value.
    - Bundles are hidden from the POS grid; known limitation: the buyer's component selection is not yet sent to the cart.
    - Every change is logged in the product change log under your name.
  - **Screenshots**: bundle editor, compatibility rule dialog
  - **Done when**: a merchant can build a bundle with rules.
  - **Status**: written in official Step 29 (2026-10-28): `bundles-and-compatibility.md` — enabling «حزمة» and the build fee, adding/editing/removing components, mandatory vs optional, the bundle total (mandatory components converted to the bundle currency × quantity + fee) and that the buyer pays the bundle's own price, first unavailable mandatory component on the storefront, the three rule operators against a second attribute or a value, hidden from POS, change-log coverage. Discrepancies: the PDP does send `bundle_optional`/`bundle_selection` inside `personalization` (stored, never priced or shown); the storefront bundle total sums raw component prices in the bundle currency (no conversion, no formula); component PATCH and rule DELETE are not logged.

- [x] **DOC-304** — Document personalization fields
  - **Source**: INT-045 (M37), INT-013 · inventory Domain 3
  - **Audience**: owner, `catalog.manage`
  - **Output**: `docs/guides/merchant/03-catalog/personalization.md`
  - **Must cover**:
    - The 9 field types; select/multi-select need options; reorder; deleting renumbers.
    - Surcharges per unit are charged in the cart and checkout (shown as «+X» on the product page) and the buyer's values are saved on the order line.
    - Known limitation: the merchant order detail does not show a line's personalization yet.
  - **Screenshots**: personalization editor, PDP with surcharge
  - **Done when**: each field type and its pricing effect is explained.
  - **Status**: written in official Step 29 (2026-10-28): `personalization.md` — the nine field types (select/multi-select need options), add, drag reorder, required toggle, delete renumbers, per-unit surcharge shown as «+ (المبلغ)» and charged in cart and checkout only when filled (worked example), values saved on the order line, known limitation: the order screen does not show a line's personalization. Discrepancy: the dashboard cannot edit a field's label/type/surcharge/options (no UI for the PATCH route).

- [x] **DOC-305** — Document auctions (المزادات) for merchants
  - **Source**: INT-045 (M37) · inventory Domain 3
  - **Audience**: owner, `catalog.manage`
  - **Output**: `docs/guides/merchant/03-catalog/auctions.md`
  - **Must cover**:
    - The auction card is created as a draft the first time it is opened; start/end, starting price, step, reserve price (never shown to buyers; «reserve met» only shown after it ends), buy-now price, anti-sniping extension.
    - Stock forced to 1 for an auction product; an active auction past its end closes automatically.
    - Bids list (newest first, bidder name + phone — no WhatsApp OTP); buy-now ends the auction.
  - **Screenshots**: auction editor, bids list
  - **Done when**: the auction lifecycle is documented end to end.
  - **Status**: written in official Step 29 (2026-10-28): `auctions.md` — the draft created on first open, start/step/reserve (never shown; «reserve met» only after the end)/buy-now/end/anti-sniping fields and rules, stock forced to 1, locks during an active auction, the bids list (newest first, name + phone, no WhatsApp OTP), the three ways it ends incl. automatic close after the end and a bid at the buy-now price, reopening. Discrepancies: closing happens on the next read (no scheduler); the PDP «اشترِ الآن بـ» button does not end the auction (step 16); an ended auction can only be reopened in two saves (UI locks the end date).

- [x] **DOC-306** — Document serial numbers and formula pricing
  - **Source**: INT-045 (M37), INT-012 · inventory Domain 3
  - **Audience**: owner, `catalog.manage`
  - **Output**: `docs/guides/merchant/03-catalog/serials-and-formula.md`
  - **Must cover**:
    - Pasting serial codes; duplicates inside the paste or against existing codes are refused and listed; stock = available units, each addition recorded as a stock movement; serialized units marked sold by POS.
    - Formula products: preview, the buyer enters a value and the unit price = formula × value (what the cart charges).
  - **Screenshots**: serials paste dialog with duplicates error, formula preview
  - **Done when**: both features have step-by-step instructions.
  - **Status**: written in official Step 29 (2026-10-28): `serials-and-formula.md` — pasting codes, duplicates inside the paste or against existing codes refused all-or-nothing and listed, counters, stock = available codes with a stock movement, POS marks units sold; formula = unit × coefficient + extra with the server preview, the buyer's value × formula unit price as charged by the cart, no tier prices on formula products. Discrepancies: stock is replaced by the available count (step 18); quote vs cart equal only in the product currency (step 13).

- [x] **DOC-307** — Document quantity (tier) prices
  - **Source**: INT-044 (M36) · inventory Domain 9
  - **Audience**: owner, `catalog.manage` (read with `inventory.view`)
  - **Output**: `docs/guides/merchant/03-catalog/tier-prices.md`
  - **Must cover**:
    - Adding a minimum quantity + price, deleting a tier; list sorted ascending in the product currency.
    - Messages: «أدخل عدداً صحيحاً موجباً.», «يوجد سعر لهذه الكمية مسبقاً.», «أدخل سعراً صحيحاً.», «السعر غير موجود.».
    - Pricing order the buyer gets: variant price → formula → highest tier ≤ quantity → base price; tiers are charged in the cart, checkout and B2B drafts (converted to the draft currency).
    - Each change logged in the product change log.
  - **Screenshots**: tier prices card
  - **Done when**: merchants understand how tiers are applied.
  - **Status**: written in official Step 29 (2026-10-28): `tier-prices.md` — adding a minimum quantity + price, deleting, ascending list in the product currency, the preview, the four messages, the pricing order (variant → formula → highest tier ≤ quantity → base price) with a worked example, charged in cart, checkout and B2B drafts (converted to the draft currency), change-log rows. No discrepancy.

- [x] **DOC-308** — Document CSV/Excel product import
  - **Source**: INT-045 (M37 / Products Phase B) · inventory Domain 3
  - **Audience**: owner, `catalog.manage`
  - **Output**: `docs/guides/merchant/03-catalog/import-products.md`
  - **Must cover**:
    - Accepted files csv/tsv/txt/xlsx, UTF-8 or Windows-1256, delimiter detected automatically, up to 20,000 rows.
    - Preview of 20 rows, suggested column mapping, row errors; name + price are required mappings.
    - Run: progress advances while the page polls (200 rows at a time); a job can be run only once.
    - Imported products are drafts; categories matched by exact name only.
  - **Screenshots**: upload step, mapping step, progress
  - **Done when**: a merchant can import a file and fix errors.
  - **Status**: written in official Step 29 (2026-10-28): `import-products.md` — csv/tsv/txt/xlsx, UTF-8 or Windows-1256, automatic delimiter, 20,000 rows, 50 MB, 200 columns; preview of 20 rows, suggested mapping, row errors, name + price required; run in 200-row steps while the page polls, once only; drafts, categories by exact name; every upload, row and run message. Discrepancies: the screen says UTF-8 only; the job stops if the page is closed (not resumable from the UI). Left open: screenshots 2–3 (no file-upload step in the pipeline).

- [x] **DOC-309** — Document product export to CSV
  - **Source**: INT-045 · inventory Domain 3
  - **Audience**: owner, `catalog.manage`
  - **Output**: `docs/guides/merchant/03-catalog/export-products.md`
  - **Must cover**:
    - Export follows the list's current filters and ordering; columns; UTF-8 BOM so Excel shows Arabic correctly.
  - **Screenshots**: export button, opened file in Excel
  - **Done when**: export behaviour is documented.
  - **Status**: written in official Step 29 (2026-10-28): `export-products.md` — export with the current filters, all matching rows, the nine columns, UTF-8 BOM for Excel. Discrepancies: the dashboard never sends the list ordering, so the file is always newest-updated first; the button needs `catalog.manage` while the route needs only `inventory.view`. Left open: screenshot 2 (file opened in Excel, outside the pipeline).

### 2.4 Orders & returns (الطلبات والمرتجعات)
Domain 4 — managing orders after placement and handling returns/RMA.

- [x] **DOC-310** — Document the orders list, counters and filters
  - **Source**: INT-007 (M06) · inventory Domain 4
  - **Audience**: owner, staff with `orders.view`
  - **Output**: `docs/guides/merchant/04-orders-returns/orders-list.md`
  - **Must cover**:
    - Status counters, filters, search; two status axes: financial status and the merchant's fulfilment status (name/colour).
    - Orders from every channel appear here with their sales channel (storefront, POS, chat, marketplaces, dropship, bookings, B2B).
  - **Screenshots**: `/dashboard/orders`
  - **Done when**: every column, filter and counter is explained.
  - **Status**: written in official Step 30 (2026-10-28): `orders-list.md` — the two status axes (financial «المالية» and fulfilment «التنفيذ» with the merchant's name/colour), the counter strip, search, the filters (status, fulfilment, payment, channel, source, dates), every column, the four sales channels vs «المصدر», bulk fulfilment change. Discrepancies: the roadmap lists seven channels (storefront, POS, chat, marketplaces, dropship, bookings, B2B) but `sales_channel` has only four (online «المتجر», pos «نقطة بيع», b2b_draft «مسودة جملة», phone «هاتفي»); chat, marketplace, dropship and booking orders show as «المتجر» with «المصدر»; the counter strip hides `pending_payment` (code vs code). Left open: screenshot `orders-list-1` registered, not captured.

- [x] **DOC-311** — Document the order detail, editing and the timeline
  - **Source**: INT-007 (M06), INT-026 · inventory Domain 4
  - **Audience**: owner, `orders.view` / `orders.update_status`
  - **Output**: `docs/guides/merchant/04-orders-returns/order-detail.md`
  - **Must cover**:
    - Detail sections, editing order data, gift message (max 300 characters).
    - Timeline: creation, every audited change, shipment events, refunds, returns.
    - Conflict: if another user changed the order meanwhile you get a conflict and the latest version — reload and redo.
    - Print/invoice from the detail.
  - **Screenshots**: order detail, timeline, print view
  - **Done when**: the detail page is fully described.
  - **Status**: written in official Step 30 (2026-10-28): `order-detail.md` — header, the sections table, editing (pickup conversion and the gift message), every timeline text, the conflict panel and «تحديث ثم إعادة المحاولة», the print view. Discrepancies: only pickup conversion and the gift message are editable; the gift counter allows 500 characters while the server caps at 300; the pickup dialog says «يُلغى التوصيل ورسومه» but `delivery_fee` is not changed; RMA events are not on the order timeline (step 19); personalization is not shown. Left open: screenshots `order-detail-1/2/3` registered, not captured.

- [x] **DOC-312** — Document changing fulfilment status, order status and custom statuses
  - **Source**: INT-007 (M06) · inventory Domain 4
  - **Audience**: owner, `orders.update_status`
  - **Output**: `docs/guides/merchant/04-orders-returns/order-statuses.md`
  - **Must cover**:
    - Fulfilment statuses; a status marked «releases stock» returns stock without forcing cancellation; cancelling restocks.
    - Managing custom statuses (add, edit, reorder).
    - Marketplace orders may be locked from some changes (marketplace guard).
  - **Screenshots**: status change menu, statuses settings
  - **Done when**: each status action and its stock effect is documented.
  - **Status**: written in official Step 30 (2026-10-28): `order-statuses.md` — changing the fulfilment status and its effects, every blocking message, the financial transitions and their stock effects, the marketplace guard messages, managing statuses (add, edit, colour, flags, reorder, delete), the seeded statuses. Discrepancies: the hint for «تُحرّر المخزون» says it cancels the order but it only restocks (the menu calls the same flag «· تُعيد المخزون»); the seeded «مكتمل» has `marks_completed` false in Django (step 19); «طلب ملغي: أعِد تفعيله…» is a UI-only rule. Left open: screenshots `order-statuses-1/2` registered, not captured.

- [x] **DOC-313** — Document payment confirmation, approval and rejection
  - **Source**: INT-007 (M06), INT-014 · inventory Domain 4
  - **Audience**: owner, `orders.update_status`
  - **Output**: `docs/guides/merchant/04-orders-returns/payment-review.md`
  - **Must cover**:
    - Confirming a bank transfer, approving/rejecting a payment under review (with the uploaded receipt and amount); rejecting a payment under review cancels the order and restocks.
    - Late receipts uploaded by buyers appear on the timeline.
  - **Screenshots**: payment review panel with receipt
  - **Done when**: the transfer verification workflow is clear.
  - **Status**: written in official Step 30 (2026-10-28): `payment-review.md` — the two waiting states, the receipt panel («المبلغ المُبلَّغ عنه», «المطلوب», «الفرق»), confirm/approve/reject and their outcomes, late receipts «أرفق العميل إيصال التحويل.», the merchant-wallet note. Discrepancies: rejecting an `awaiting_payment`/`pending_payment` order does not cancel or restock (back to `pending_payment`, payment `failed`), yet the toast «رُفض الدفع؛ أُبلغ العميل» is shown and no notification is sent. Left open: screenshot `payment-review-1` registered, not captured.

- [x] **DOC-314** — Document creating a manual order
  - **Source**: INT-007 (M06) · inventory Domain 4
  - **Audience**: owner, `orders.update_status`
  - **Output**: `docs/guides/merchant/04-orders-returns/manual-order.md`
  - **Must cover**:
    - Form options (products, customer, delivery, payment), validation messages; B2B drafts are a separate staff workflow (see B2B guide).
  - **Screenshots**: manual order form
  - **Done when**: a manual order can be created from the guide.
  - **Status**: written in official Step 30 (2026-10-28): `manual-order.md` — the steps, every field and limit, phone order vs B2B draft (status, stock, timeline), every validation message. Discrepancies: drafts are made from the same form (`b2b_draft`) for members holding `orders.create_b2b`, and need a staff session; the sidebar entry is gated by `orders.view` while the screen and Django need `orders.update_status` (code vs code); no notification reaches the customer (step 19). Left open: screenshot `manual-order-1` registered, not captured.

- [x] **DOC-315** — Document order refunds and the refunds log
  - **Source**: INT-007 (M06), INT-026 (M24), INT-028, INT-020, INT-034 · inventory Domain 4
  - **Audience**: owner, `orders.refund`
  - **Output**: `docs/guides/merchant/04-orders-returns/refunds.md`
  - **Must cover**:
    - Refund methods (wallet credit / store credit / manual/cash), refund cap; effects: order status «refunded», merchant-wallet reversal, loyalty points claw-back, affiliate commission claw-back, webhook `order.refunded`.
    - Cash refunds need drawer liquidity: message «CashLiquidityError: …».
    - Refunds log (read-only, actor shown) requires `orders.refund`.
  - **Screenshots**: refund dialog, `/dashboard/orders/refunds`
  - **Done when**: every refund effect is described.
  - **Status**: written in official Step 30 (2026-10-28): `refunds.md` — the four methods and their caps, every effect (status «مسترد» on full refund, merchant-wallet debit, loyalty claw-back on full refund only, affiliate/influencer commission claw-back, webhook `order.refunded`), every message, the refunds log (columns, search, filters). Discrepancies: methods are wallet / sharwa_pay / manual / wallet_credit, not "wallet / store credit / manual"; `CashLiquidityError` applies to cash RETURN approvals only; the refunds log has no actor column; its path is `/dashboard/returns/refunds-log` and needs feature `refunds`; affiliate claw-back is derived in partners_service. Left open: screenshots `refunds-1/2` registered, not captured.

- [x] **DOC-316** — Document handling return requests (المرتجعات)
  - **Source**: INT-026 (M24) · inventory Domain 4
  - **Audience**: owner, staff with `orders.process_returns` (plan feature `refunds`)
  - **Output**: `docs/guides/merchant/04-orders-returns/returns.md`
  - **Must cover**:
    - Return list (customer name, lines count, amount, location, timeline, decision note); creating a return with per-line quantity errors; remaining quantity ignores rejected returns.
    - Approve: restocks each «restock» line to the chosen location (or the fulfilment's), records a «إرجاع #id» stock movement; wallet/store-credit returns credit the customer wallet; any money failure cancels the whole approval; status becomes completed in one step.
    - Reject requires a note (shown as the decision note); a decided or outdated return shows a conflict.
    - Location list works even without multi-location.
  - **Screenshots**: returns list, approve dialog with location
  - **Done when**: approve/reject paths and their effects are documented.
  - **Status**: written in official Step 30 (2026-10-28): `returns.md` — the list (strip, search, columns), creating a return with per-line quantity errors and «المتبقي», the four methods, approve (location, restock movement, money, all-or-nothing, «مكتمل» in one step), reject with «سبب الرفض», conflicts, every message. Discrepancies: the UI requires a location whenever a line restocks, so the fulfilment-location fallback is never used; «إرجاع #id» is the movement note, not its reference (step 19); the hint «محفظة العميل تتطلب محفظة قائمة…» is the mock's rule (Django creates the wallet); the liquidity hint suggests changing the method, which the decision cannot do; the empty state points to an «إرجاع» button that the order screen does not have; the conflict bar says «حُدِّث الطلب…»; «معتمد» and «قيد المعالجة» are never produced. Left open: screenshots `returns-1/2` registered, not captured.

- [x] **DOC-317** — Document RMA: shipping items back, scanning and QA
  - **Source**: INT-026 (M24) · inventory Domain 4
  - **Audience**: owner, `orders.process_returns` + `inventory.adjust` for scan/QA
  - **Output**: `docs/guides/merchant/04-orders-returns/rma.md`
  - **Must cover**:
    - Creating an RMA, statuses (requested → in transit back …), counts per status, search.
    - Scanning a returned parcel (accepts «RMA-12»), locked destination, re-scan conflict, quarantine.
    - QA result «restocked» moves quarantine → on-hand with an «RMA-<id>» stock movement.
  - **Screenshots**: RMA list, scan screen, QA dialog
  - **Done when**: RMA lifecycle is documented.
  - **Status**: written in official Step 30 (2026-10-28): `rma.md` — the lifecycle table, the list (strip, search, columns), creating an RMA (fee payer from the reason, locked destination), the scan screen («RMA-12» or 12, re-scan 409, wrong destination, quarantine), the QA decision (restock → on-hand with a «إعادة مخزون من استرجاع» movement noted «RMA-{id} — اجتاز الفحص», or disposal), every message. Discrepancies: Django creates RMAs directly in `in_transit_back` and never stores `requested`, `received_at_warehouse` or `closed` (the mock creates `requested`); scan/QA accept `orders.process_returns` OR `inventory.adjust`, while list/detail/create and the sidebar need `orders.process_returns`; Django status/reason labels differ from the UI labels. Left open: screenshots `rma-1/2/3` registered, not captured; a scan result line (no Enter-key step in the pipeline).

### 2.5 Buyer help centre (مركز مساعدة المشتري — واجهة المتجر)
Domain 5 plus every storefront-facing row from Domains 3, 6, 7, 9 and 13. Written for shoppers; the merchant guide links to it.

- [x] **DOC-318** — Document browsing the store: home, categories, search, filters and offers
  - **Source**: INT-011 (M09) · inventory Domain 5
  - **Audience**: buyer
  - **Output**: `docs/guides/buyer/05-storefront/browse-and-search.md`
  - **Must cover**:
    - Home sections set by the merchant, category menu with images, sub-categories included when choosing a parent category.
    - Search across Arabic/English names and description with Arabic-insensitive matching; sort by newest, price low/high, name.
    - Facet filters (brand, tag, collection with counts); active offers strip (up to 6).
    - Choosing the display currency (remembered in a cookie).
  - **Screenshots**: storefront home, listing with facets
  - **Done when**: a shopper can find products using every tool listed.
  - **Status**: written in official Step 15 (2026-10-27): `browse-and-search.md` — home sections, category menu (parents include sub-categories), search (2 characters, 5 suggestions, Arabic-insensitive name/description), facets with counts, sort, offers strip (up to 6), currency switcher. Discrepancy: the sort menu has no «name» option (Django accepts it). Screenshots registered in `docs/guides/_assets/shots.json` but not captured (no shell on the device) — run `npx tsx scripts/guide-screenshots.ts --only buyer/05` in mock mode.

- [x] **DOC-319** — Document the product page
  - **Source**: INT-012 (M10), INT-045, INT-044, INT-036 · inventory Domain 5
  - **Audience**: buyer
  - **Output**: `docs/guides/buyer/05-storefront/product-page.md`
  - **Must cover**:
    - Images/video, choosing variants (colour swatches, images), unit and min/max quantities, backorder availability, quantity price table, formula value input with live quote, bundles (components, total, unavailable component), personalization fields (+X per unit), refundable deposit, bookable services (slots), auctions, related/upsell/cross-sell, reviews summary.
    - Prices shown in the chosen currency.
  - **Screenshots**: PDP of a variant product, a bundle, a service
  - **Done when**: every PDP block is explained.
  - **Status**: written in official Step 15 (2026-10-27): `product-page.md` — gallery and video, variants, quantity/max, pre-order, quantity price table, formula price, bundles, personalization (+ per unit, 5MB), deposit and upfront lines, bookable services (15-minute hold, 10 holds max), auctions, related rows, reviews with WhatsApp confirmation, back-in-stock. Left open: bundle and service screenshots (mock fixture ids unknown). Screenshots registered in `docs/guides/_assets/shots.json` but not captured (no shell on the device) — run `npx tsx scripts/guide-screenshots.ts --only buyer/05` in mock mode.

- [x] **DOC-320** — Document the cart, coupons and free shipping progress
  - **Source**: INT-013 (M11), INT-019, INT-044, INT-036 · inventory Domain 5
  - **Audience**: buyer
  - **Output**: `docs/guides/buyer/05-storefront/cart.md`
  - **Must cover**:
    - Adding with variant (required if the product has variants) and quantity; caps at stock (unless backorder) / maximum quantity / 1 for auctions; hidden products shown but unpriced.
    - Applying/removing a coupon with the store's exact messages; automatic offers shown as applied offers; quantity prices applied.
    - Free-shipping progress bar (threshold compared in the store currency).
    - Appointment lines: one booking per line («+» disabled), holds expire after 15 minutes and drop out of the cart.
  - **Screenshots**: cart with coupon and progress bar
  - **Done when**: every cart behaviour is covered.
  - **Status**: written in official Step 15 (2026-10-27): `cart.md` — add/caps (stock unless pre-order, max quantity, auction = 1, one booking per line with «+» disabled), unavailable unpriced lines, every coupon message, automatic offers, quantity prices, free-shipping bar (store-currency threshold converted). Discrepancy: the coupon-minimum message prints the store currency code. Screenshots registered in `docs/guides/_assets/shots.json` but not captured (no shell on the device) — run `npx tsx scripts/guide-screenshots.ts --only buyer/05` in mock mode.

- [x] **DOC-321** — Document abandoned-cart reminders and the restore link
  - **Source**: INT-013 (M11), INT-019 · inventory Domain 5, Domain 7
  - **Audience**: buyer
  - **Output**: `docs/guides/buyer/05-storefront/cart-reminders.md`
  - **Must cover**:
    - Leaving a WhatsApp number in the cart lets the store remind you; the reminder link `/cart/restore/<token>` (valid 7 days) restores lines and the reminder coupon.
  - **Screenshots**: phone capture, restored cart
  - **Done when**: buyers understand the reminder and restore flow.
  - **Status**: written in official Step 15 (2026-10-27): `cart-reminders.md` — «احفظ سلتي برقم واتساب», when reminders are sent (merchant delays, minimum value, step-2 coupon), restore link valid 7 days, merge-by-key replace, reminder coupon. Known limitation: restore does not check stock and rebuilds lines without the variant id. The redirect page `/cart/restore/[token]` was not readable (eight folders deep).

- [x] **DOC-322** — Document checkout: delivery or pickup
  - **Source**: INT-014 (M12), INT-021 · inventory Domain 5
  - **Audience**: buyer
  - **Output**: `docs/guides/buyer/05-storefront/checkout-delivery.md`
  - **Must cover**:
    - Delivery methods and fees in the cart currency (Sharwa Ship only when the store has it), free-shipping flag, pickup points (zero delivery fee), sharing the location coordinates.
    - Changed method/pickup errors: re-select.
  - **Screenshots**: delivery step
  - **Done when**: delivery/pickup choices are clear.
  - **Status**: written in official Step 15 (2026-10-27): `checkout-delivery.md` — buyer fields, delivery tabs, methods and fees, «شروة شيب» tag only when available, free-shipping flag, pickup points (zero fee), sharing location (delivery only), geography guard, gift fields, every field error. Known limitation: the gift block is hidden in live mode (`gifting_enabled` not emitted by Django). Screenshots registered in `docs/guides/_assets/shots.json` but not captured (no shell on the device) — run `npx tsx scripts/guide-screenshots.ts --only buyer/05` in mock mode.

- [x] **DOC-323** — Document checkout payment methods
  - **Source**: INT-014 (M12), INT-017, INT-028, INT-048 · inventory Domain 5
  - **Audience**: buyer
  - **Output**: `docs/guides/buyer/05-storefront/checkout-payment.md`
  - **Must cover**:
    - Cash on delivery: offered only when nothing is due upfront (not with deposits), protected by a WhatsApp code; may be unavailable if the store disabled your number.
    - Bank transfer: receipt image (JPEG/PNG only) + amount required (the receipt replaces the code); order awaits the store's confirmation.
    - Online gateways (e.g. Jeeb, Kuraimi): enter the purchase code / PIN fields shown; charged directly, no redirect.
    - Sharwa Pay: code sent to your number and balance shown.
    - Using store wallet balance (code) and redeeming loyalty points (code; applied before the wallet; the wallet is only used if you choose «use wallet»).
  - **Screenshots**: payment step for each method
  - **Done when**: each method's requirements are listed.
  - **Status**: written in official Step 15 (2026-10-27): `checkout-payment.md` — COD (no upfront, WhatsApp code, store-disabled numbers), bank/wallet transfer (receipt + amount, no code, awaits confirmation), Jeeb/Kuraimi direct charge, Sharwa Pay code and balance, customer wallet and loyalty points (points first, wallet only with «الدفع من محفظتي»), summary lines, limits. Discrepancies: the UI says «ستنتقل إلى بوابة الدفع لإكمال العملية.» although the charge is direct; loyalty block hidden in live mode (`loyalty_enabled` not emitted). Screenshots registered in `docs/guides/_assets/shots.json` but not captured (no shell on the device) — run `npx tsx scripts/guide-screenshots.ts --only buyer/05` in mock mode.

- [x] **DOC-324** — Document placing the order, retries and common checkout errors
  - **Source**: INT-014 (M12), INT-036 · inventory Domain 5, A.7
  - **Audience**: buyer
  - **Output**: `docs/guides/buyer/05-storefront/place-order.md`
  - **Must cover**:
    - Double clicks or retries never create two orders.
    - Items that became hidden/out of stock → the changed lines are shown, review and confirm again; another order within one minute is refused (wait).
    - Field errors are shown before any code is used; buy-now orders are separate from the cart; buy-now of a service holds the chosen time.
  - **Screenshots**: changed-items warning
  - **Done when**: every checkout failure has a buyer action.
  - **Status**: written in official Step 15 (2026-10-27): `place-order.md` — check order (same order returned, 1-minute guard, changed lines, field errors before any code, codes, reservation), no double orders, «تغيّر:» warning, buy-now isolation and service hold, every error. Left open: changed-items screenshot (no storefront recipe yet).

- [x] **DOC-325** — Document the order success page and uploading a late receipt
  - **Source**: INT-014 (M12), INT-023 · inventory Domain 5
  - **Audience**: buyer
  - **Output**: `docs/guides/buyer/05-storefront/order-success.md`
  - **Must cover**:
    - The success page content; uploading a receipt later for transfer orders awaiting confirmation; subscribing to order notifications.
  - **Screenshots**: `/checkout/success/<uuid>`
  - **Done when**: buyers know what to do after ordering.
  - **Status**: written in official Step 15 (2026-10-27): `order-success.md` — headings by state, details, next-step sentence per method, 2-second polling, WhatsApp / tracking / continue buttons, late receipt form, push opt-in. Discrepancy: the late-receipt form only appears when no receipt is attached, and Django requires one at placement, so storefront buyers cannot replace a receipt. The page file and the Google Ads conversion stay unverified. Screenshots registered in `docs/guides/_assets/shots.json` but not captured (no shell on the device) — run `npx tsx scripts/guide-screenshots.ts --only buyer/05` in mock mode.

- [x] **DOC-326** — Document order tracking and the pickup code
  - **Source**: INT-015 (M41) · inventory Domain 5
  - **Audience**: buyer
  - **Output**: `docs/guides/buyer/05-storefront/track-order.md`
  - **Must cover**:
    - Tracking link `/track/<uuid>` (no login, not indexed); payment status + preparation status; one card per shipment with events newest first and carrier name («شروة شيب»).
    - Courier name and phone shown only while picked up / in transit and only for the store's own couriers or Sharwa Ship.
    - Ready states: pickup order «جاهز للاستلام» with a 6-digit pickup code (valid 30 days, hidden after collection); delivery order «جاهز للشحن».
    - Explanations for returned / cancelled / lost-compensated; deposit split; return-policy excerpt; gift orders show no amounts or buyer data.
    - Known limitation: pickup code verification at the counter is not yet available in the dashboard.
  - **Screenshots**: tracking page delivery + pickup
  - **Done when**: every tracking state is explained.
  - **Status**: written in official Step 15 (2026-10-27): `track-order.md` — link without login (noindex), two status axes, roll-up, one card per shipment, carrier and waybill, shipment steps and explanations, courier call button rules, pickup code (6 digits, 30 days, hidden after collection), gift privacy, return request and policy excerpt, known limitations. Discrepancies: courier name never displayed; orders without a Fulfillment row show «جاهز للاستلام» without a code. Left open: pickup-card screenshot. Screenshots registered in `docs/guides/_assets/shots.json` but not captured (no shell on the device) — run `npx tsx scripts/guide-screenshots.ts --only buyer/05` in mock mode.

- [x] **DOC-327** — Document installing the store app (PWA) and order notifications
  - **Source**: INT-016 (M44) · inventory Domain 5
  - **Audience**: buyer
  - **Output**: `docs/guides/buyer/05-storefront/app-and-notifications.md`
  - **Must cover**:
    - Installing the store as an app (manifest/icon from the store branding).
    - Order notifications are tied to an order (the phone is taken from that order — typing another number does nothing); notifications for shipped, delivered, cancelled, payment received, picked up, in transit, returned, ready for pickup; at most one of each kind per order every 6 hours.
    - «إيقاف التنبيهات» to unsubscribe; re-linking an existing browser subscription.
  - **Screenshots**: install prompt, subscribe button
  - **Done when**: subscribe/unsubscribe and what triggers a push are clear.
  - **Status**: written in official Step 16 (2026-10-27): `app-and-notifications.md` — install bar (second visit or a cart, never on checkout, «كيف؟» steps on iOS, 14-day dismissal), icon/name/colour from the store, offline page; push opt-in from the success page, phone taken from the order, the seven triggers, one per kind per order every 6 hours, «إيقاف التنبيهات», re-linking. Left open: install-bar screenshot (needs `beforeinstallprompt` or an iOS user agent). Screenshots registered in `docs/guides/_assets/shots.json` but not captured (no shell on the device) — run `npx tsx scripts/guide-screenshots.ts --only buyer/05` in mock mode.

- [x] **DOC-328** — Document the wishlist and the shopper phone
  - **Source**: INT-029 (M42) · inventory Domain 5
  - **Audience**: buyer
  - **Output**: `docs/guides/buyer/05-storefront/wishlist.md`
  - **Must cover**:
    - Saving your phone once (no code) to keep a wishlist; toggling items; unpublished items show «لم يعد متاحاً», archived items disappear; prices shown live in your currency.
  - **Screenshots**: wishlist page
  - **Done when**: wishlist behaviour is documented.
  - **Status**: written in official Step 16 (2026-10-27): `wishlist.md` — phone once without a code, toggle, three item states («لم يعد متاحاً», sold out with alert, available), live prices in the chosen currency, archived items dropped; known limitation: anyone with the number can see the list. Screenshots registered in `docs/guides/_assets/shots.json` but not captured (no shell on the device) — run `npx tsx scripts/guide-screenshots.ts --only buyer/05` in mock mode.

- [x] **DOC-329** — Document back-in-stock alerts
  - **Source**: INT-029 (M42) · inventory Domain 5
  - **Audience**: buyer
  - **Output**: `docs/guides/buyer/05-storefront/back-in-stock.md`
  - **Must cover**:
    - Subscribing on an out-of-stock product; repeat subscription is accepted; after being notified you can subscribe again.
  - **Screenshots**: notify-me button
  - **Done when**: alert flow documented.
  - **Status**: written in official Step 16 (2026-10-27): `back-in-stock.md` — subscribing from the product page or the wishlist, repeat subscription accepted, re-subscribing after a notification, per-product scope. Discrepancy: the code that sends the alert and sets `notified_at` was not found in the files read. Left open: screenshot (no sold-out fixture id).

- [x] **DOC-330** — Document product reviews and store reviews
  - **Source**: INT-029 (M42), INT-017 · inventory Domain 5
  - **Audience**: buyer
  - **Output**: `docs/guides/buyer/05-storefront/reviews.md`
  - **Must cover**:
    - Product review: rating + text, verified by a WhatsApp code (resend after 60 s); message «سيظهر تقييمك بعد المراجعة» — hidden until the store approves.
    - Reading reviews (5 per page, filter by rating, summary).
    - Store reviews: published immediately, 3 per hour per visitor; comments without stars don't count in the average.
  - **Screenshots**: review form, store review widget
  - **Done when**: both review types are covered.
  - **Status**: written in official Step 16 (2026-10-27): `reviews.md` — reading (5 then «عرض المزيد», star filter, store reply), product review with WhatsApp code (60 s resend, 10-minute code, hidden until approved), store review on «من نحن» (published at once, 3 per hour, starless comments not counted). Discrepancies: the UI says «… بعد المراجعة إن لزم.» for both types and maps the store-review 429 to «حاول بعد دقيقة.». Screenshots registered in `docs/guides/_assets/shots.json` but not captured (no shell on the device) — run `npx tsx scripts/guide-screenshots.ts --only buyer/05` in mock mode.

- [x] **DOC-331** — Document booking an appointment
  - **Source**: INT-036 (M26) · inventory Domain 13
  - **Audience**: buyer
  - **Output**: `docs/guides/buyer/05-storefront/book-appointment.md`
  - **Must cover**:
    - Choosing a date, slots in the store's timezone, next available date (up to 21 days ahead), held/booked slots unavailable.
    - The chosen time is held for 15 minutes; «لم يعد هذا الموعد متاحاً.»; at most 10 active holds per visitor; checkout confirms the booking.
    - Unavailable when the store's bookings feature is off.
  - **Screenshots**: slot picker
  - **Done when**: booking steps and limits are clear.
  - **Status**: written in official Step 16 (2026-10-27): `book-appointment.md` — day and time in the store's timezone, 30-minute steps, held/booked slots, 15-minute hold, «لم يعد هذا الموعد متاحاً.», 10 holds, one booking per cart line, checkout confirms, feature off. Discrepancy: the picker shows 7 days only, so a next available date beyond them (Django scans 21) is never offered. Left open: screenshot (fixture id unknown).

- [x] **DOC-332** — Document bidding in an auction
  - **Source**: INT-045 (M37) · inventory Domain 3
  - **Audience**: buyer
  - **Output**: `docs/guides/buyer/05-storefront/auction-bidding.md`
  - **Must cover**:
    - Bid with name + phone + amount in your currency; refusals: draft, ended, below the next bid; per-field errors.
    - Anti-sniping extension near the end; buy-now ends the auction; «reserve met» shown only after the end.
  - **Screenshots**: auction block on PDP
  - **Done when**: bidding rules are documented.
  - **Status**: written in official Step 16 (2026-10-27): `auction-bidding.md` — the panel, bid with name + phone + suggested amount in the chosen currency, refusals (draft, ended, below the next bid) and field errors, anti-sniping extension, reserve shown only after the end, a bid at the buy-now price ends the auction. Discrepancy: the panel's «اشترِ الآن بـ» button opens an ordinary buy-now checkout and neither bids nor ends the auction. Left open: screenshot (fixture id unknown).

- [x] **DOC-333** — Document referral (affiliate) links for shoppers
  - **Source**: INT-034 (M17) · inventory Domain 7
  - **Audience**: buyer
  - **Output**: `docs/guides/buyer/05-storefront/referral-links.md`
  - **Must cover**:
    - Opening a store link with `?aff_id=` credits the referrer for 30 days on this device; nothing else is required from the shopper.
  - **Screenshots**: none
  - **Done when**: a short explanation exists (also linked from the affiliates guide).
  - **Status**: written in official Step 16 (2026-10-27): `referral-links.md` — `?aff_id=` credits the referrer for 30 days on this browser, last link wins, no price change, self-referral ignored, nothing required from the shopper.

- [x] **DOC-334** — Document wallet balance and loyalty points for shoppers
  - **Source**: INT-028 (M35) · inventory Domain 6
  - **Audience**: buyer
  - **Output**: `docs/guides/buyer/05-storefront/wallet-and-points.md`
  - **Must cover**:
    - Checking wallet balance and points with a WhatsApp code; redeeming points at checkout (programme on, minimum points, enough balance, wallet not disabled; converted inside the order — restored if the order fails); the wallet is in SAR.
  - **Screenshots**: wallet preview, redeem points
  - **Done when**: shoppers know how to see and use their balance.
  - **Status**: written in official Step 16 (2026-10-27): `wallet-and-points.md` — customer wallet in SAR shown in the chosen currency, «الدفع من محفظتي» with a WhatsApp code, earning and redeeming points (programme on, minimum, enough balance, wallet not disabled, converted inside the order and restored if it fails, points before the wallet). Discrepancy: the balance and points are shown without any code (only spending needs one). Left open: screenshots (no fixture phones with balance / points).

### 2.6 Customers, wallets & loyalty (العملاء والمحافظ والولاء)
Domain 6 — the derived customer (by phone), CRM tools, customer wallets and loyalty points.

- [x] **DOC-335** — Document the customers list, search and segments
  - **Source**: INT-017 (M07) · inventory Domain 6
  - **Audience**: owner, staff with `customers.view`
  - **Output**: `docs/guides/merchant/06-customers-wallets/customers-list.md`
  - **Must cover**:
    - There is no customer sign-up: a customer is everyone who used a phone number; different forms of the same number (77…, 077…, 96777…) are merged.
    - Orders count (all placed orders), total spent (non-cancelled only, in the dashboard currency); name = latest order's name, other names listed; marketplace-only customers have no phone.
    - Segments with live counts (identical to campaign audiences; «خامل» = 90 days without orders).
  - **Screenshots**: `/dashboard/customers`, segment counts
  - **Done when**: list, merge rule and segments are explained.
  - **Status**: written in official Step 31 (2026-10-28): `customers-list.md` — no sign-up and the derived customer, the phone-spelling merge (77…/077…/96777…/+967/Arabic digits, 05… → 966…), latest name and other names, marketplace-only rows («هاتف غير متاح من السوق»), every column (orders = all placed, spend = non-cancelled in the display currency, platform trust buckets), sorting, phone/name search, every filter, the four segments and the segment line («الشريحة: … · N عميلاً», «إنشاء حملة لهذه الشريحة»). Discrepancies: the segment count is the campaign resolver and can differ from the list's own segment rows (step 20); the campaign model defaults dormant_days to 30; the screen and sidebar item «تقرير العميل» are also gated by the plan feature customer_report, which Django does not check. Left open: screenshots `customers-list-1/2` registered, not captured.

- [x] **DOC-336** — Document the customer profile tabs
  - **Source**: INT-017 (M07), INT-029 · inventory Domain 6
  - **Audience**: owner, `customers.view` / `customers.edit_profile`
  - **Output**: `docs/guides/merchant/06-customers-wallets/customer-profile.md`
  - **Must cover**:
    - Tabs: orders (needs `customers.view`, not `orders.view`), wallet transactions, points, wishlist, reviews, notes, COD.
    - Trust: platform-wide trust and this store's reliability shown separately (never merged).
    - Reviews tab: approve hidden reviews with «اعتماد», reply as admin; status «بانتظار المراجعة».
    - Notes: add notes; only the author or the owner can delete.
    - Viewing profiles counts toward your viewing volume (staff behaviour monitoring).
  - **Screenshots**: profile with each tab
  - **Done when**: each tab's content and actions are described.
  - **Status**: written in official Step 31 (2026-10-28): `customer-profile.md` — sheet and full page, header (other names, phone copy/WhatsApp W, first/last order, email, segment flags), the number strip, the two COD trust readings side by side, the six tabs (orders needs only customers.view, wallet last 10, points ≤ 50, wishlist + back-in-stock, reviews with «بانتظار المراجعة»/«اعتماد» and the admin reply, notes with author-or-owner delete and N), staff view counting (5,000/day warning, never refused). Discrepancies: there is no COD tab — the COD block sits above the six tabs; notes are writable with customers.view (step 20); the wallet tab's actor/reference differ from the M35 ledger (step 20). Left open: screenshots `customer-profile-1/2` registered, not captured; one shot per remaining tab.

- [x] **DOC-337** — Document disabling/enabling cash on delivery for a customer
  - **Source**: INT-017 (M07), INT-014 · inventory Domain 6
  - **Audience**: owner, `customers.edit_profile`
  - **Output**: `docs/guides/merchant/06-customers-wallets/cod-control.md`
  - **Must cover**:
    - Manual disable/enable with a reason (audited); no change → conflict message; automatic disable after repeated refusals reads «أُوقف تلقائياً بعد N مرات».
    - Effect: the storefront refuses COD for that phone.
  - **Screenshots**: COD tab dialog
  - **Done when**: COD controls and effect documented.
  - **Status**: written in official Step 31 (2026-10-28): `cod-control.md` — disable and re-enable (reason 3–300, typed «تفعيل» for re-enabling, client-side only), the two 409 texts, audit log, the storefront refusal «التوصيل بالدفع عند الاستلام غير متاح لهذا الرقم — اختر طريقة أخرى.», automatic disable after COD_REFUSAL_THRESHOLD (3) with «أُوقف تلقائياً بعد (العدد) مرات رفض استلام.». Discrepancies: the automatic reason is the full sentence «أُوقف تلقائياً بعد {refusals} مرات رفض استلام.» (step 20); the reason is validated before the unchanged-value 409. Left open: screenshots `cod-control-1/2` registered, not captured.

- [x] **DOC-338** — Document exporting customers
  - **Source**: INT-017 (M07) · inventory Domain 6
  - **Audience**: owner, `customers.view`
  - **Output**: `docs/guides/merchant/06-customers-wallets/export-customers.md`
  - **Must cover**:
    - CSV export (row count shown), blank phone for marketplace-only customers; exports are audited and counted; refused when you reach the export limit or after a critical behaviour alert today.
  - **Screenshots**: export button
  - **Done when**: export rules documented.
  - **Status**: written in official Step 31 (2026-10-28): `export-customers.md` — the confirm dialog, all matching rows newest first, the ten English columns, blank phone for marketplace-only customers, UTF-8 BOM, the toast with the X-Export-Rows count, staff limits (1,000 rows ⇒ critical alert and refusal for the rest of the day, 5,000 hard limit), «تجاوزت حدّ التصدير اليومي، راجع مدير المتجر.». Discrepancies: the export needs customers.export («تصدير بيانات العملاء»), not customers.view — the button is hidden and Django answers 403 without it; «كاشير» cannot export. Left open: screenshot `export-customers-1` registered, not captured.

- [x] **DOC-339** — Document customer wallets: list, transactions and manual top-up/adjustment
  - **Source**: INT-028 (M35) · inventory Domain 6
  - **Audience**: owner, `customers.view` (read) / `customers.edit_profile` (write); plan feature `customer_wallets`
  - **Output**: `docs/guides/merchant/06-customers-wallets/customer-wallets.md`
  - **Must cover**:
    - Search by phone (local 0777… matches) or name; sort by balance / last transaction; totals; creating a wallet for a phone.
    - Transactions with signed amounts, reference to the refund or order, actor («النظام» for automatic).
    - Top-up types: manual top-up, reward, adjustment; a debit only as adjustment with a note; insufficient balance refused; retrying does not double-credit.
    - Wallet is always SAR and is the same balance used by refunds and checkout.
  - **Screenshots**: wallets list, top-up dialog
  - **Done when**: all wallet operations documented.
  - **Status**: written in official Step 31 (2026-10-28): `customer-wallets.md` — what a customer wallet is (SAR only, one per phone, same balance as refunds/checkout/redemption, append-only ledger, auto-created), list totals, phone/name search, sort, columns, creating a wallet, the ledger (reasons, references, actor «النظام», signed amounts, «بعد:»), top-up/reward/adjustment, debit only as «تسوية» with a note and a confirm step, insufficient balance, one transaction per form opening, every message. Discrepancies: a Saudi 05… number is refused on create (no 966 completion, step 20); name search sees the stored name only; nothing in the API or dashboard can disable a wallet although «معطّلة» is shown and enforced. Left open: screenshots `customer-wallets-1/2` registered, not captured.

- [x] **DOC-340** — Document loyalty points (customer view)
  - **Source**: INT-028 (M35), INT-019 · inventory Domain 6
  - **Audience**: owner, `customers.view`; plan feature `loyalty_settings`
  - **Output**: `docs/guides/merchant/06-customers-wallets/loyalty-points.md`
  - **Must cover**:
    - Points balances (highest first, wallet link, last earn), per-phone transactions; read-only programme summary for staff (programme settings are owner-only in Marketing).
    - Redemption converts points to wallet credit at checkout; refunds claw back points.
  - **Screenshots**: points list
  - **Done when**: points screens explained.
  - **Status**: written in official Step 31 (2026-10-28): `loyalty-points.md` — earning (net of discounts and wallet, no delivery fee, rounded down), redemption into a wallet credit with a WhatsApp code and the minimum, full-refund claw-back capped at the balance, the points list (highest first, last earn, wallet link), the per-phone ledger with «حركة محفظة #…», the read-only programme line and the owner-only settings link. Discrepancies: only a full refund claws points back (step 30); points are earned at order placement while three UI texts say «من الطلبات المكتملة»; rates are cast to integers for display (step 20). Left open: screenshot `loyalty-points-1` registered, not captured.

### 2.7 Marketing, store design & partners (التسويق والتصميم والمسوّقون)
Domain 7.

- [x] **DOC-341** — Document the theme customizer: colours, fonts, logo, presets
  - **Source**: INT-018 (M08) · inventory Domain 7
  - **Audience**: owner only («تصميم المتجر مقصور على مالك المتجر.»); plan feature `storefront_design`
  - **Output**: `docs/guides/merchant/07-marketing-design-partners/theme.md`
  - **Must cover**:
    - Logo upload/clear, colours (#RRGGBB), Google fonts list, design styles, card border, presets or custom; live preview frame.
    - Conflict when the theme was saved elsewhere meanwhile — reload.
  - **Screenshots**: customizer panels, preset gallery
  - **Done when**: every theme control documented.
  - **Status**: written in official Step 32 (2026-10-28): `theme.md` — the draft/publish editor (status «منشور»/«غير منشور»/«يُنشر…»/«تعارض», «تجاهل», «نشر», ⌘S, device switch, phone drawer), the nine presets by name, five colours #RRGGBB with the contrast hint, the 11 fonts, the five design styles, logo upload (jpg/jpeg/png/webp/gif ≤ 5 MB, uploaded on publish), the publish order and partial-failure banner, the 409 conflict flow with «إعادة التحميل». Discrepancy: the dashboard has no way to clear a published logo (Django accepts it). Left open: screenshots `theme-1`, `theme-2` registered, not captured.

- [x] **DOC-342** — Document storefront sections (home page builder)
  - **Source**: INT-018 (M08) · inventory Domain 7
  - **Audience**: owner
  - **Output**: `docs/guides/merchant/07-marketing-design-partners/sections.md`
  - **Must cover**:
    - Section types; custom label ≤ 80 chars; product grid limit 1–50 with an existing category; slider/banner grid 1–12 items each with a title or image; hero title/subtitle/button text/link (`/` or `https://`); item images jpg/png/webp/gif ≤ 5 MB; publishing many new images at once is limited to 8 MB per save.
    - Singleton sections can't be duplicated or deleted; type can't change after creation; reorder all sections.
  - **Screenshots**: section editor, reorder
  - **Done when**: every section rule documented.
  - **Status**: written in official Step 32 (2026-10-28): `sections.md` — the eight section types (five singletons, three addable), reorder by drag/keyboard/buttons, enable/disable and «يظهر على الجوال», add/edit/delete, per-type fields (label ≤ 80, hero 120/240/40 and link `/` or `https://`, grid category + limit 1–50, slider/banner 1–12 items with a title or image, images ≤ 5 MB), the publish order and the reorder-failed line, every structural message. Discrepancies: the 8 MB request bound applies per section request (each section is saved separately), not per publish; `limit` 1–50 applies to every type that carries it (step 21). Left open: screenshots `sections-1`, `sections-2` registered, not captured.

- [x] **DOC-343** — Document the announcement bar
  - **Source**: INT-018, INT-010 (M34) · inventory Domain 7, Domain 12
  - **Audience**: owner; plan feature `coupon`
  - **Output**: `docs/guides/merchant/07-marketing-design-partners/announcement-bar.md`
  - **Must cover**:
    - The nine fields (text, colours, speed, page flags…); an enabled bar needs text; same settings in design and store settings.
  - **Screenshots**: announcement editor + storefront bar
  - **Done when**: announcement settings documented.
  - **Status**: written in official Step 32 (2026-10-28): `announcement-bar.md` — the nine settings (switch, text ≤ 255 with the 200-character hint, two colours, speed slow/medium/fast, four placements), the enabled-needs-text rule, the two editing places (design tab: owner-only, publish; settings: owner + the two manager roles, auto-save) writing the same row, plan feature `coupon`. No new discrepancy (the stricter caller rule of the design route was recorded in step 21). Left open: screenshot `announcement-bar-1` registered, not captured.

- [x] **DOC-344** — Document coupons
  - **Source**: INT-019 (M13) · inventory Domain 7
  - **Audience**: owner, `discounts.apply` (view) / `discounts.manage` (edit); plan feature `coupon`
  - **Output**: `docs/guides/merchant/07-marketing-design-partners/coupons.md`
  - **Must cover**:
    - Code upper-cased and unique; percentage 1–100 (whole numbers) or fixed; dates and computed state (scheduled/active/expired); influencer coupons keep their code and can't be deleted here.
    - Marketing summary screen.
  - **Screenshots**: coupons list, coupon form
  - **Done when**: coupon rules documented.
  - **Status**: written in official Step 32 (2026-10-28): `coupons.md` — «مركز التسويق» (summary line, seven tools, «غير متاح في خطتك»/«للمالك فقط», announcement link), create/edit/delete, the computed states in order (inactive, exhausted, not started, expired, active), every field and limit, influencer coupons (code locked, not deletable here), the buyer-side refusal messages. Discrepancies: amounts are in the store display currency although the form says «ر.س» (the Track 1 page m13 §1 says SAR); the influencer link targets the unbuilt `/dashboard/influencers/<id>`. Left open: screenshots `coupons-1`…`coupons-3` registered, not captured.

- [x] **DOC-345** — Document offers (discount, free shipping, buy X get Y) and conditions
  - **Source**: INT-019 (M13) · inventory Domain 7
  - **Audience**: owner, `discounts.manage`
  - **Output**: `docs/guides/merchant/07-marketing-design-partners/offers.md`
  - **Must cover**:
    - «شرط التطبيق» for every offer type: all products, category, product, minimum items; buy X get Y with all/min-items; offer image; priority (higher first); offers shown on the storefront strip.
  - **Screenshots**: offer form with conditions
  - **Done when**: each offer type with each condition documented.
  - **Status**: written in official Step 32 (2026-10-28): `offers.md` — the three offer types, «شرط التطبيق» for discount/free shipping (whole order, category, product, minimum items — and on what the discount is computed), «شرط الشراء» for buy X get Y with the repeat rule and a worked example, every field, the preview, the list. Discrepancies: the screen is gated on `promotions` while Django checks `coupon`; priority only orders offers — every eligible offer is applied and summed (capped at the subtotal); buy X get Y needs the reward product already in the cart. Left open: screenshots `offers-1`…`offers-3` registered, not captured.

- [x] **DOC-346** — Document abandoned carts and reminders
  - **Source**: INT-019 (M13), INT-013 · inventory Domain 7
  - **Audience**: owner; plan feature `abandoned_carts`
  - **Output**: `docs/guides/merchant/07-marketing-design-partners/abandoned-carts.md`
  - **Must cover**:
    - List, counters, items priced at current price; manual «تذكير» sends the next reminder step (same template/channel/second-step coupon as automatic ones); refused when no channel can deliver.
    - Reminder settings with template variables validated per reminder.
  - **Screenshots**: carts list, settings
  - **Done when**: reminders flow documented.
  - **Status**: written in official Step 32 (2026-10-28): `abandoned-carts.md` — states (2-hour threshold, lazy update), counters and filters, the cart sheet with items at current price, manual «إرسال تذكير» = the next step with the same template/channel/coupon, the four refusal messages, the settings page (channels, minimum value, two reminders with per-reminder variables, recovery coupon BACK… one use), automatic timing. Discrepancies: the UI keeps «إرسال تذكير» after two reminders and says another can be sent, the server refuses; the reminder-2 hint says «من وقت ترك السلة.» but the delay runs from the first reminder. Left open: screenshots `abandoned-carts-1`…`-3` registered, not captured.

- [x] **DOC-347** — Document campaigns: draft, preview, send, schedule
  - **Source**: INT-019 (M13), INT-017, INT-040 · inventory Domain 7
  - **Audience**: owner; plan feature `campaigns`
  - **Output**: `docs/guides/merchant/07-marketing-design-partners/campaigns.md`
  - **Must cover**:
    - Audience segments (dormant = 90 days), channels (WhatsApp/social need an active installed app; SMS/e-mail not connected yet → refused), preview with count + rendered message.
    - Send now (cannot be sent twice) or schedule for a future time (sent automatically within ~5 minutes); cancel a schedule by returning it to draft.
  - **Screenshots**: campaign wizard, preview
  - **Done when**: the whole lifecycle is documented.
  - **Status**: written in official Step 32 (2026-10-28): `campaigns.md` — lifecycle diagram (draft → scheduled ↔ draft → sent), connected channels and «اربط القناة», the four audiences (dormant = 90 days), preview (channel-aware count, rendered message), send now (cannot be sent twice), schedule (sent within about 5 minutes) and cancel back to draft, read-only sent campaigns, all messages. Discrepancy: the dashboard disables unconnected channels, so SMS/e-mail cannot even be drafted (the API would accept the draft and refuse the send). Left open: screenshots `campaigns-1`…`-3` registered, not captured.

- [x] **DOC-348** — Document the marketing timeline, loyalty programme and gifting settings
  - **Source**: INT-019 (M13), INT-028 · inventory Domain 7
  - **Audience**: owner; plan features `timeline`, `loyalty_settings`, `gift_settings`
  - **Output**: `docs/guides/merchant/07-marketing-design-partners/timeline-loyalty-gifting.md`
  - **Must cover**:
    - Timeline events with optional campaign/offer links and date filter.
    - Loyalty programme settings (earning, minimum redemption) and gifting settings (gift orders hide amounts/buyer data on tracking); both appear on the storefront config.
  - **Screenshots**: timeline, loyalty form, gift settings
  - **Done when**: each screen documented.
  - **Status**: written in official Step 32 (2026-10-28): `timeline-loyalty-gifting.md` — timeline months, events with type/colour/dates/optional campaign and offer links and notes; loyalty programme (switch, riyals per point, points per riyal, minimum, integer-only, example line); gifting switch and what a gift order hides (tracking: amounts and buyer; printed invoice: prices). Discrepancies: the timeline screen has no date filter (the API has one); loyalty/gifting are not in the storefront config (steps 06, 16, 21), so checkout hides both in live mode; the gifting screen names the buyer option «أرسله كهدية» while checkout says «هذا الطلب هدية». Left open: screenshots `timeline-loyalty-gifting-1`…`-3` registered, not captured.

- [x] **DOC-349** — Document affiliates (المسوّقون)
  - **Source**: INT-034 (M17) · inventory Domain 7
  - **Audience**: owner (writes), staff may read
  - **Output**: `docs/guides/merchant/07-marketing-design-partners/affiliates.md`
  - **Must cover**:
    - Adding an affiliate (phone 967/966 + 9 digits, unique), commission percent («10») or fixed in SAR («المبلغ (ر.س)»), referral link `<store>/?aff_id=`; stop (deactivate).
    - List search/sort (name, pending, sales, clicks, last sale) and «has pending» filter; summary; clicks counted once per visitor session.
    - Owed («المستحق») = commissions of paid, non-cancelled orders minus commissions already paid for orders refunded later (may be negative).
    - Mark paid: only eligible sales, oldest first, within the owed amount; preview first; writes message «إدارة المسوّقين والمؤثرين ومستحقاتهم لمالك المتجر.» for staff.
  - **Screenshots**: affiliates list, sales, mark-paid preview
  - **Done when**: payout rules are clear.
  - **Status**: written in official Step 32 (2026-10-28): `affiliates.md` — attribution (referral code `aff_…`, link `<store>/?aff_id=`, 30-day cookie, one click per new code, stopped affiliates and self-referral excluded, one affiliate per order), commission base and SAR amounts, add/share/stop, the list (strip, columns, five sort keys, «لديه مستحقات فقط»), the detail page, «المستحق» formula (may be negative), mark paid (eligible only, oldest first, within the net owed, stops at the first sale that does not fit) with a worked example, staff read-only with «إدارة المسوّقين والمؤثرين ومستحقاتهم لمالك المتجر.». Discrepancy: clicks are counted once per new code per visitor cookie (30 days), not per session. Left open: screenshots `affiliates-1`, `affiliates-2` registered, not captured.

- [x] **DOC-350** — Document influencers (المؤثرون)
  - **Source**: INT-034 (M17), INT-019 · inventory Domain 7
  - **Audience**: owner
  - **Output**: `docs/guides/merchant/07-marketing-design-partners/influencers.md`
  - **Must cover**:
    - Influencer linked to a coupon code; sales attributed by the order's coupon; same owed/mark-paid rules as affiliates (unpaid/cancelled orders are never paid).
  - **Screenshots**: influencer detail
  - **Done when**: influencer workflow documented.
  - **Status**: written in official Step 32 (2026-10-28): `influencers.md` — attribution by the order's coupon code, the linked-coupons block, the coupon column of sales, the same owed/mark-paid rules (unpaid or cancelled orders never paid), fields and list. Discrepancies: no dashboard or API path links a coupon to an influencer («إنشاء كوبون لهذا المؤثر» creates an unlinked coupon); stopping an influencer does not stop attribution (Django checks only the coupon); staff can read the influencer screens. Left open: screenshot `influencers-1` registered, not captured.

### 2.8 Finance (المالية: المدفوعات والمحفظة والمصروفات)
Domain 8 merchant side.

- [x] **DOC-351** — Document payment gateways setup
  - **Source**: INT-020 (M14) · inventory Domain 8
  - **Audience**: owner only; plan features `payment_gateways` (banks) / `local_wallets` (Jeeb)
  - **Output**: `docs/guides/merchant/08-finance/payment-gateways.md`
  - **Must cover**:
    - Gateways in your plan only; fields per gateway (Jeeb: merchant_id, base URL, API key, API secret; Kuraimi: merchant_code, base URL, API key, API secret); secrets shown masked «••••» + last 4; leaving a field empty keeps it; partial save allowed; enabling needs every required field («لا يمكن تفعيل … قبل تعبئة: …»); base URL must be a URL.
    - You cannot disable the last enabled payment method.
  - **Screenshots**: gateways list, credential form
  - **Done when**: each gateway can be configured from the guide.
  - **Status**: written in official Step 31 (2026-10-28): `payment-gateways.md` — the two gateways and their fields, the three states, saving credentials, enabling with the 5-second undo, the disable confirm, masking «••••» + last 4, empty field keeps the stored value, «لا يمكن تفعيل (البوابة) قبل تعبئة: (الحقول)», the last-method guard, the URL message, money goes to the bank not the store wallet. Discrepancies: the dashboard form refuses a partial save that Django accepts; the whole gateways section needs payment_gateways, so a local_wallets-only plan cannot reach Jeeb; http:// is accepted although the message says https:// (step 22); the owner-only 403 text differs between Django and the UI. Left open: screenshots `payment-gateways-1/2` registered, not captured.

- [x] **DOC-352** — Document store payment methods (manual, Sharwa Pay, COD)
  - **Source**: INT-020, INT-010 · inventory Domain 8, Domain 12
  - **Audience**: owner
  - **Output**: `docs/guides/merchant/08-finance/payment-methods.md`
  - **Must cover**:
    - Enabling methods; «at least one payment method» guard (manual + Sharwa Pay + gateways).
  - **Screenshots**: payments section
  - **Done when**: guard and options documented.
  - **Status**: written in official Step 31 (2026-10-28): `payment-methods.md` — the two switches «قبول شروة باي» / «قبول التحويل اليدوي» with undo, where each method's money goes, the active-accounts line, COD tied to the manual switch and refused when upfront is required, the «يجب تفعيل طريقة دفع واحدة على الأقل.» guard (manual + Sharwa Pay + complete gateways), the read-only settings section «الدفع». Discrepancies: COD has no switch of its own: the storefront offers it only when manual payment is enabled and no upfront is due; the settings summary warns «لن يستطيع المشترون الدفع إلا عند الاستلام.» when manual and Sharwa Pay are off, which is wrong; the page needs one of three plan features while store/payments/ has none. Left open: screenshot `payment-methods-1` registered, not captured.

- [x] **DOC-353** — Document payout accounts
  - **Source**: INT-020 (M14) · inventory Domain 8
  - **Audience**: owner; plan feature `bank_transfers`
  - **Output**: `docs/guides/merchant/08-finance/payout-accounts.md`
  - **Must cover**:
    - Bank and wallet accounts (banks first), counts; duplicate numbers detected ignoring spaces/dashes/Arabic digits; reorder within a type; cannot delete an account used by a pending withdrawal; accounts also shown to buyers for transfers.
  - **Screenshots**: payout accounts list
  - **Done when**: account management documented.
  - **Status**: written in official Step 31 (2026-10-28): `payout-accounts.md` — bank and wallet tabs with counts, the customer preview, add/edit (type fixed after creation), visibility toggle, drag reorder within a type, duplicate numbers ignoring spaces/dashes, delete with the pending-withdrawal refusal and «تعطيل بدلاً من الحذف», every message. Discrepancies: UI limits (80/40/120) are tighter than Django's (100/150/150) and the UI rejects Arabic digits that Django normalises; the wallet tab follows local_wallets while every route needs bank_transfers; the storefront mixes banks and wallets in sort order. Left open: screenshot `payout-accounts-1` registered, not captured.

- [x] **DOC-354** — Document the merchant wallet and withdrawals
  - **Source**: INT-020 (M14) · inventory Domain 8
  - **Audience**: owner; plan feature `merchantwallet`
  - **Output**: `docs/guides/merchant/08-finance/merchant-wallet.md`
  - **Must cover**:
    - Balance = available + reserved (pending withdrawals); transaction types (order payment, refund, adjustment, withdrawal) with links.
    - A withdrawal is debited immediately and refunded if rejected; a retried request never creates a second debit.
  - **Screenshots**: wallet page, withdrawal form
  - **Done when**: wallet math and withdrawal lifecycle are explained.
  - **Status**: written in official Step 31 (2026-10-28): `merchant-wallet.md` — what enters and leaves the wallet (Sharwa Pay, Sharwa-courier COD; not manual transfers or direct gateways), the four currency rows, balance = available + reserved with a worked example, the ledger columns and filters, the withdrawal form, confirm, immediate debit, idempotent resend, approval/rejection by Sharwa with the credit back, the withdrawals list. Discrepancies: `commission` is a declared kind that nothing writes (step 22); there is no HTTP route for the decision and the admin action passes no reason (step 22). Left open: screenshots `merchant-wallet-1/2` registered, not captured.

- [x] **DOC-355** — Document platform dues (المستحقات)
  - **Source**: INT-020 (M14), INT-031 · inventory Domain 8, Domain 16
  - **Audience**: owner
  - **Output**: `docs/guides/merchant/08-finance/platform-dues.md`
  - **Must cover**:
    - Commissions and app charges, totals per currency («2.50 ر.س · $1»), whether commission is enabled; dues are collected by the platform from your Sharwa Pay wallet.
  - **Screenshots**: dues tab
  - **Done when**: dues are explained.
  - **Status**: written in official Step 31 (2026-10-28): `platform-dues.md` — commissions and app charges, the two tabs, per-currency totals joined with « · » over all rows, status filter from the strip, columns, statuses, collection from the Sharwa Pay wallet by Sharwa, the commission-off state. Discrepancies: dues have no plan feature in Django but the item and screen need merchantwallet (step 10); the empty state says commissions are recorded on electronically paid orders while commission_service records them for any order reaching the credit hook; the header «تُحصَّل من رصيد محفظتك» under «محفظة المتجر» means the Sharwa Pay wallet; with commissions off the tab hides old pending rows. Left open: screenshot `platform-dues-1` registered, not captured.

- [x] **DOC-356** — Document operating expenses (المصروفات)
  - **Source**: INT-043 (M33) · inventory Domain 8
  - **Audience**: owner + staff with `expenses.manage` («مدير المتجر», «مدير الفرع» by default); no plan feature
  - **Output**: `docs/guides/merchant/08-finance/expenses.md`
  - **Must cover**:
    - Adding an expense: 4 categories, amount, currency (default SAR), date (future allowed), note ≤ 500; errors per field.
    - Expenses can't be edited or deleted; list grouped by month, 50 per page, each month shows its full totals per currency; filters (invalid values ignored); «أُدخل بواسطة» name (owner rows unnamed).
    - Without the permission there is no form (403); on mobile the «مصروف جديد» bar sits above the bottom navigation.
  - **Screenshots**: expenses list desktop + mobile
  - **Done when**: expenses workflow and restrictions documented.
  - **Status**: written in official Step 31 (2026-10-28): `expenses.md` — the form (4 categories, amount, currency SAR by default, date with future allowed, note ≤ 500, N and /), month grouping with per-currency totals over the whole filtered month, 50 per page, filters, «أدخله», no edit/delete, the 403 screen, the mobile «مصروف جديد» bar above the bottom navigation, every message. Discrepancies: the column is «أدخله» and owner rows read «المالك» (roadmap: «أُدخل بواسطة», owner unnamed); the sidebar item sits in the merchantwallet group although expenses need no feature (step 10); a resend after a network error can create a duplicate (no idempotency key). Left open: screenshot `expenses-1` (+ mobile) registered, not captured.

### 2.9 B2B wholesale (البيع بالجملة)
Domain 9.

- [x] **DOC-357** — Document creating a B2B draft order
  - **Source**: INT-044 (M36), INT-007 · inventory Domain 9
  - **Audience**: staff with `orders.create_b2b` (staff session required — owner cannot create drafts)
  - **Output**: `docs/guides/merchant/09-b2b/create-draft.md`
  - **Must cover**:
    - Form choices: approver roles (system roles first), active branches, currency; in a multi-branch store a branch is required; unsupported currency → «عملة غير مدعومة.».
    - Line prices use quantity tiers converted to the draft's currency.
  - **Screenshots**: B2B draft form
  - **Done when**: draft creation documented.
  - **Status**: written in official Step 47 (2026-10-29): `docs/guides/merchant/09-b2b/create-draft.md` — Arabic RTL from `guide-page.md`: staff-session rule with the owner notice «إنشاء المسودة يتم بحساب موظف — حساب المالك وحده يُرفض من الخادم.», the field table (approver roles system-first with «الافتراضي» = «مدير المتجر», branch required in a multi-branch store, the four currencies), server-side pricing (quantity tier ≤ quantity, converted into the draft's currency; line prices are a preview «للقطعة · السعر النهائي من الخادم»), every server and form message incl. «عملة غير مدعومة.», the negotiation known limit; 1 screenshot placeholder; no discrepancies.

- [x] **DOC-358** — Document approving/rejecting B2B drafts
  - **Source**: INT-044 (M36), INT-022 · inventory Domain 9, Domain 12
  - **Audience**: staff with `orders.approve_b2b` (or `orders.create_b2b` to view), owner
  - **Output**: `docs/guides/merchant/09-b2b/approve-drafts.md`
  - **Must cover**:
    - Drafts list (requester name, escalated first then newest); resolving updates the linked order; unknown request → «طلب الموافقة غير موجود.».
    - Haggling/negotiation drafts are not available yet.
  - **Screenshots**: drafts list, resolve dialog
  - **Done when**: approval flow documented.
  - **Status**: written in official Step 47 (2026-10-29): `docs/guides/merchant/09-b2b/approve-drafts.md` — the queue (escalated first, then newest; «أنشأها» = requester), the either-permission view rule, the sheet with `A`/`R`, confirm dialogs, approve → order proceeds / reject → order cancelled (same as «طلبات الموافقة»), no self-approval, the 409 conflict sentence, «طلب الموافقة غير موجود.», negotiation drafts not available; 2 screenshot placeholders; no discrepancies.

### 2.10 Inventory, locations & procurement (المخزون والمواقع والمشتريات)
Domain 10 — one stock ledger fed by every operation.

- [x] **DOC-359** — Document the inventory hub, counters and statuses
  - **Source**: INT-024 (M21) · inventory Domain 10
  - **Audience**: owner, `inventory.view`; plan feature `inventory`
  - **Output**: `docs/guides/merchant/10-inventory-locations-procurement/inventory-hub.md`
  - **Must cover**:
    - One row per product with variants under it; parent stock = variant sum and worst status (out › backorder › low › in stock); per-location view when multi-location is on; search name/SKU/barcode/variant SKU (Arabic-insensitive); filters status/category/serialized; reserved quantity; pending write-offs counter.
  - **Screenshots**: `/dashboard/inventory`
  - **Done when**: each column/status explained.
  - **Status**: written in official Step 33 (2026-10-28): `inventory-hub.md` — the five sub-sections, the counter strip (products counted once with their worst variant status, catalog stock), every column, the four statuses and the worst-status rule (out › backorder › low › in stock), Arabic-insensitive search over name/SKU/barcode/variant SKU, the status/category/type filters, the per-location view (on hand − reserved − quarantine = available), reserved quantity, the pending write-offs badge, why a quantity cannot be edited. Left open: screenshots `inventory-hub-1`, `-2` registered, not captured.

- [x] **DOC-360** — Document stock adjustments
  - **Source**: INT-024 (M21), INT-025 · inventory Domain 10
  - **Audience**: owner, `inventory.adjust`
  - **Output**: `docs/guides/merchant/10-inventory-locations-procurement/adjust-stock.md`
  - **Must cover**:
    - Enter a change or a new quantity; reasons manual adjust / restock; note required when decreasing; no negative stock unless backorder; serialized/bundle/auction products refused with their messages; multi-location requires choosing a location.
  - **Screenshots**: adjust dialog
  - **Done when**: adjustment rules documented.
  - **Status**: written in official Step 33 (2026-10-28): `adjust-stock.md` — change (±) or new quantity, reasons «تعديل يدوي» / «إعادة تعبئة», note required when decreasing, no negative stock unless backorder, serialized/bundle/auction refusals with their messages, location required in multi-location mode, every server message. Discrepancy: a unit with no stock row at a location can never be adjusted there and the location page offers no way to add it (only PO receiving creates the row), while two UI texts say otherwise. Left open: screenshot `adjust-stock-1` registered, not captured.

- [x] **DOC-361** — Document stock movements history, items and reservations
  - **Source**: INT-024 (M21) · inventory Domain 10
  - **Audience**: owner, `inventory.view`
  - **Output**: `docs/guides/merchant/10-inventory-locations-procurement/movements-and-reservations.md`
  - **Must cover**:
    - Movements with actor («النظام» for automatic), balance after, reference (order, PO, return, RMA, approval…), net change, filters.
    - Serialized items list with location/order; reservations (order / B2B draft / cart) — expired holds shown released.
  - **Screenshots**: movements, reservations
  - **Done when**: history screens documented.
  - **Status**: written in official Step 33 (2026-10-28): `movements-and-reservations.md` — the ledger columns (actor «النظام» for automatic rows, balance after, references order/PO/return/write-off approval, net change over the filtered set, filters), serial units (status, location, order), reservations (order / B2B draft / checkout cart; expired holds shown «مُفرَج» and not counted). Discrepancy: the PO reference reads `PO-3` while the PO number is `PO-0003`. Left open: screenshots `movements-and-reservations-1`…`-3` registered, not captured.

- [x] **DOC-362** — Document write-offs (الإتلاف) with approval
  - **Source**: INT-024 (M21), INT-022 · inventory Domain 10
  - **Audience**: staff with `inventory.writeoff`, approver «مدير المتجر»
  - **Output**: `docs/guides/merchant/10-inventory-locations-procurement/writeoffs.md`
  - **Must cover**:
    - Requesting a write-off creates an approval; nothing is deducted until approved; on approval stock is deducted; if stock no longer covers it the approval is refused and stays pending; the approvals list shows quantity and note.
  - **Screenshots**: write-off form, approval card
  - **Done when**: write-off flow documented.
  - **Status**: written in official Step 33 (2026-10-28): `writeoffs.md` — request (nothing deducted), approval in the approvals queue (deducted then, «طلب إعدام #…» reference), refused approval when stock no longer covers it (stays pending), rejection with a note, no self-approval, the list and every message. Discrepancies: approver role falls back to the first active role (step 23); deciding needs plan feature `staff_rbac`, off by default (step 23); the form lists only the first 100 products and shows catalog stock as «المتاح الآن». Left open: screenshots `writeoffs-1`, `-2` registered, not captured.

- [x] **DOC-363** — Document inventory export
  - **Source**: INT-024 · inventory Domain 10
  - **Audience**: owner, `reports.export`
  - **Output**: `docs/guides/merchant/10-inventory-locations-procurement/export-inventory.md`
  - **Must cover**:
    - CSV with BOM, one line per sellable unit; the export is audit-logged.
  - **Screenshots**: export button
  - **Done when**: export documented.
  - **Status**: written in official Step 33 (2026-10-28): `export-inventory.md` — the «تصدير CSV» button (disabled without `reports.export`), current filters, one line per sellable unit, all matching rows, columns, BOM, file name, audit log entry. No new discrepancy. Left open: screenshot `export-inventory-1` registered, not captured.

- [x] **DOC-364** — Document locations: types, creation and hierarchy
  - **Source**: INT-025 (M22) · inventory Domain 10
  - **Audience**: owner (define); any member reads; plan feature `multi_location`
  - **Output**: `docs/guides/merchant/10-inventory-locations-procurement/locations.md`
  - **Must cover**:
    - Location types/flags/ownership (owned, franchise with contract end, supplier with contact by WhatsApp/e-mail/webhook URL, locker with provider and locker code/compartments, vehicle with driver phone, virtual without coordinates), parent/child (cycles refused), external references, products count, search.
    - Owner-only message «إدارة المواقع مقصورة على مالك المتجر.».
    - Deactivation impact (stock on hand, open fulfilments) before deactivating.
  - **Screenshots**: locations list, location form variants
  - **Done when**: every location type documented.
  - **Status**: written in official Step 33 (2026-10-28): `locations.md` — the eight capability flags, four ownerships, the conditional sections (hours, locker provider/code/capacity, franchise end, dropship channel WhatsApp/e-mail/webhook, vehicle plate/driver phone), virtual ⇒ no coordinates, the computed «نوع العرض» table, parent/child without cycles, external references, products count, search and filters, the owner-only message, the deactivation impact dialog (not a refusal). Left open: screenshots `locations-1`, `-2` registered, not captured.

- [x] **DOC-365** — Document turning multi-location on/off
  - **Source**: INT-025, INT-010 · inventory Domain 10, Domain 12
  - **Audience**: owner
  - **Output**: `docs/guides/merchant/10-inventory-locations-procurement/multi-location-mode.md`
  - **Must cover**:
    - Turning it off with stock in more than one location shows conflicts; choose merge to proceed (total stock already equals the sum, nothing moves).
  - **Screenshots**: mode dialog with conflicts
  - **Done when**: mode switch documented.
  - **Status**: written in official Step 33 (2026-10-28): `multi-location-mode.md` — what changes, turning on (screen or settings), turning off with the conflict list and «دمج الكميات وإيقاف» (nothing moves; totals already equal the sum), turning off with stock in one location. Discrepancies: the confirm text says turning on moves stock to a default location, but nothing is created or moved; the activation screen hard-codes «WH-01 المستودع الرئيسي». Left open: screenshots `multi-location-mode-1`, `-2` registered, not captured.

- [x] **DOC-366** — Document per-location inventory
  - **Source**: INT-025 (M22) · inventory Domain 10
  - **Audience**: owner, `inventory.view` / `inventory.adjust`
  - **Output**: `docs/guides/merchant/10-inventory-locations-procurement/location-inventory.md`
  - **Must cover**:
    - Items below reorder point first (falls back to the product's low-stock threshold); adjust at a location; quarantine quantity may not exceed on-hand minus reserved.
  - **Screenshots**: location inventory tab
  - **Done when**: location stock documented.
  - **Status**: written in official Step 33 (2026-10-28): `location-inventory.md` — columns (available = on hand − reserved − quarantine), below-reorder first with the product low-stock fallback, the «تحت حد الطلب» filter, adjust at the location, limits (reorder point, quarantine ≤ on hand − reserved, no movement). Discrepancy: the catalog mirror ignores quarantine (step 23); the empty state promises rows on first adjustment. Left open: screenshots `location-inventory-1`, `-2` registered, not captured.

- [x] **DOC-367** — Document location staff assignments
  - **Source**: INT-025, INT-022 · inventory Domain 10
  - **Audience**: owner, `staff.manage_assignments`
  - **Output**: `docs/guides/merchant/10-inventory-locations-procurement/location-staff.md`
  - **Must cover**:
    - One operational role per staff per location (re-assigning replaces it); never on yourself.
  - **Screenshots**: location staff tab
  - **Done when**: assignments documented.
  - **Status**: written in official Step 33 (2026-10-28): `location-staff.md` — the five operational roles (labels, not permissions), assign/remove, one role per staff per location (a second assignment replaces), never on yourself, active staff only. Discrepancy: the picker hides already-assigned staff, so changing a role in the UI is remove-then-assign. Left open: screenshot `location-staff-1` registered, not captured.

- [x] **DOC-368** — Document order routing rules
  - **Source**: INT-025 (M22) · inventory Domain 10
  - **Audience**: owner
  - **Output**: `docs/guides/merchant/10-inventory-locations-procurement/routing-rules.md`
  - **Must cover**:
    - Rules with priorities (renumbered 1..n, names generated), reorder (all rules), preview: first active matching rule, else the first active shipping location.
  - **Screenshots**: routing rules, preview
  - **Done when**: routing documented.
  - **Status**: written in official Step 33 (2026-10-28): `routing-rules.md` — rule sentence, matching table (exact city, category, AND, catch-all), first matching rule wins, fallback to the first active shipping location, add (always last), reorder (renumbered 1..n), edit, delete, generated names, «جرّب التوجيه» (rule-only, ignores stock). Discrepancies: orders are not routed automatically yet (the routing engine is not wired into checkout); a rule pointing to an inactive location is said to be skipped but the preview still returns it. Left open: screenshot `routing-rules-1` registered, not captured.

- [x] **DOC-369** — Document suppliers
  - **Source**: INT-035 (M23) · inventory Domain 10
  - **Audience**: `suppliers.manage` (write), `suppliers.approve` (read); no plan feature
  - **Output**: `docs/guides/merchant/10-inventory-locations-procurement/suppliers.md`
  - **Must cover**:
    - Supplier fields (name unique ignoring case, phone optional, address, tax number); a supplier referenced by any purchase order cannot be deleted — deactivate instead.
  - **Screenshots**: suppliers list/form
  - **Done when**: supplier management documented.
  - **Status**: written in official Step 33 (2026-10-28): `suppliers.md` — fields and limits (name unique ignoring case, phone optional 9–15 digits, address, tax number), list/search, supplier page with its orders, deactivate vs delete (any linked order blocks the delete). Discrepancy: the delete dialog counts only non-cancelled orders and tells the user to cancel them, but cancelled orders still block the delete. Left open: screenshots `suppliers-1`, `-2` registered, not captured.

- [x] **DOC-370** — Document purchase orders: draft, submit, approve, receive, cancel
  - **Source**: INT-035 (M23), INT-022 · inventory Domain 10
  - **Audience**: `suppliers.manage` (create/receive), `suppliers.approve` (decide), owner
  - **Output**: `docs/guides/merchant/10-inventory-locations-procurement/purchase-orders.md`
  - **Must cover**:
    - Numbers «PO-0001»; search by supplier, line SKU or number; product picker (cost converted to store currency; serialized/bundle/auction excluded); whole-number quantities, unit cost ≤ 2 decimals in the order currency; single-location stores use the first active location.
    - Submit → approval; no self-approval; rejection returns the PO to draft; cancel from any non-final status (closes a pending approval «أُلغي أمر الشراء.»); receiving adds stock (per location or flat) with a movement.
    - Conflict «حُدِّث الأمر من مستخدم آخر.»; timeline of every event.
  - **Screenshots**: PO list, PO detail with timeline, receive dialog
  - **Done when**: the PO lifecycle is documented.
  - **Status**: written in official Step 33 (2026-10-28): `purchase-orders.md` — lifecycle diagram and allowed actions, numbers «PO-0001», search by number/supplier/SKU, line picker (cost converted to store currency; serialized/bundle/auction excluded), whole quantities and 2-decimal cost in the order currency, single-location stores use the first active location, submit → approval, no self-approval, rejection returns to draft, cancel from any non-final status closing the approval with «أُلغي أمر الشراء.», receiving per location or flat with a movement, the conflict «حُدِّث الأمر من مستخدم آخر.», the timeline texts, board/table views. No new discrepancy. Left open: screenshots `purchase-orders-1`…`-3` registered, not captured.

### 2.11 Shipping & Sharwa Ship for merchants (الشحن وشروة شيب)
Domain 11 merchant side.

- [x] **DOC-371** — Document shipping settings
  - **Source**: INT-021 (M15), INT-010 · inventory Domain 11
  - **Audience**: owner only («إعدادات الشحن مقصورة على مالك المتجر.»); plan feature `shipping_settings`
  - **Output**: `docs/guides/merchant/11-shipping/shipping-settings.md`
  - **Must cover**:
    - Default fee, free-shipping threshold (in the dashboard currency), other shipping section fields.
  - **Screenshots**: shipping settings
  - **Done when**: settings explained.
  - **Status**: written in official Step 34 (2026-10-28): `shipping-settings.md` — owner-only gate and the `shipping_settings` feature; default fee in YER_NEW and free-shipping threshold in the store display currency (0 = none), 2-decimal/8-digit rule, the error without a final full stop, shared row with the settings section; the fee charged comes from the selected method, the default applies only without one; threshold converted to the cart currency and compared with the subtotal; other free-shipping causes. No new discrepancy. Left open: screenshot `shipping-settings-1` registered, not captured.

- [x] **DOC-372** — Document delivery methods including the official «شروة شيب» method
  - **Source**: INT-021 (M15) · inventory Domain 11
  - **Audience**: owner; plan feature `shipping_companies`
  - **Output**: `docs/guides/merchant/11-shipping/delivery-methods.md`
  - **Must cover**:
    - Creating methods; the official «شروة شيب» method: only price/time/active editable, name read-only, cannot be deleted, disappears from your list when disabled.
  - **Screenshots**: methods list, official method form
  - **Done when**: methods documented.
  - **Status**: written in official Step 34 (2026-10-28): `delivery-methods.md` — list, «كما يراها العميل» preview, add/edit/delete (delete removes linked SLA rules, past orders keep the name), the official «شروة شيب» method (price/time/active only, name fixed, no delete, disabled = gone from the list and not re-enabled by the merchant), checkout hiding it without the `sharwa_ship` feature. Discrepancy: the screen opens with `shipping_settings` while the methods list needs `shipping_companies`. Left open: screenshots `delivery-methods-1`, `-2` registered, not captured.

- [x] **DOC-373** — Document pickup locations
  - **Source**: INT-021 (M15), INT-025 · inventory Domain 11
  - **Audience**: owner; plan feature `pickuplocation`
  - **Output**: `docs/guides/merchant/11-shipping/pickup-locations.md`
  - **Must cover**:
    - Add/edit/reorder pickup points; hint about locations marked as pickup points.
  - **Screenshots**: pickup locations
  - **Done when**: documented.
  - **Status**: written in official Step 34 (2026-10-28): `pickup-locations.md` — add/edit/delete, drag and «رفع»/«خفض» reorder saved at once, renumbering, the M22 «— هذا الموقع نقطة استلام أيضاً» hint (hint only), zero fee and the 6-digit 30-day pickup code, known limits (delete clears the pickup point of open orders; counter verification not built). No new discrepancy. Left open: screenshot `pickup-locations-1` registered, not captured.

- [x] **DOC-374** — Document own-fleet delivery providers (couriers)
  - **Source**: INT-021 (M15), INT-046 · inventory Domain 11
  - **Audience**: owner; plan feature `shipping_providers`
  - **Output**: `docs/guides/merchant/11-shipping/delivery-providers.md`
  - **Must cover**:
    - Provider types, limits (legacy rows show «—»), linking one staff account to one agent (never a terminated member, never on a carrier company) so they use the courier app; a provider with past orders cannot be deleted — disable it.
  - **Screenshots**: providers list/form
  - **Done when**: provider setup documented.
  - **Status**: written in official Step 34 (2026-10-28): `delivery-providers.md` — agents vs carrier accounts, limits and defaults (legacy rows «—»), hazardous rule, one staff ↔ one agent (never terminated, never a carrier; carrier change drops the link), delete refused with past orders → disable. Discrepancies: staff-options is not filtered (step 25); the companies tab opens with `shipping_companies` while every providers route needs `shipping_providers`. Left open: screenshot `delivery-providers-1` registered, not captured.

- [x] **DOC-375** — Document 3PL carriers (Aramex, SMSA) credentials and testing
  - **Source**: INT-021 (M15) · inventory Domain 11
  - **Audience**: owner
  - **Output**: `docs/guides/merchant/11-shipping/carriers.md`
  - **Must cover**:
    - Credential fields (Aramex: username, password, account number, account PIN; SMSA: username, password); secrets never shown back, empty keeps; using the platform's shared account vs your own (credential source), save disabled until the platform enables the carrier.
    - «اختبار الاتصال»: Aramex checks reachability; a failure marks the carrier in error for 24 h; SMSA test not available yet.
  - **Screenshots**: carrier screen
  - **Done when**: carrier setup documented.
  - **Status**: written in official Step 34 (2026-10-28): `carriers.md` — connection states, Aramex (4 fields) and SMSA (2) credentials, secrets never shown and empty keeps, shared vs own account, save disabled until the platform enables the carrier, «اختبار الاتصال» (Aramex reachability only, SMSA not available), 24-hour error state, circuit breaker, webhook URL and signature, 7-day no-events warning, audit by field names. Discrepancies: the SMSA test always fails and flips the carrier to error; the dashboard cannot switch back to the shared account. Left open: screenshot `carriers-1` registered, not captured.

- [x] **DOC-376** — Document Sharwa Ship zones (read-only), packaging profiles, restricted zones and SLA rules
  - **Source**: INT-021 (M15) · inventory Domain 11
  - **Audience**: owner
  - **Output**: `docs/guides/merchant/11-shipping/zones-packaging-sla.md`
  - **Must cover**:
    - Platform Sharwa Ship zones map (zones without bounds not drawn).
    - Packaging profiles (weights in grams).
    - Restricted zones drawn as polygons with a reason.
    - SLA rules by zone and/or delivery method (fallback 72 h).
  - **Screenshots**: zones map, polygon editor, SLA list
  - **Done when**: each config screen documented.
  - **Status**: written in official Step 34 (2026-10-28): `zones-packaging-sla.md` — read-only zones with the schematic map (zones without centre/radius not drawn), packaging profiles in cm/grams with one default, restricted polygons (one «lat, lng» per line, ≥ 3 points, reason, checkout refusal), SLA rules by zone and/or method with the resolution order and the 72 h fallback. Discrepancy: the SLA screen says no late shipments are tracked without rules, but the 72 h default still feeds «تجاوز SLA». Left open: screenshots `zones-packaging-sla-1`…`-3` registered, not captured.

- [x] **DOC-377** — Document zone review and shipping edge cases
  - **Source**: INT-021 (M15) · inventory Domain 11
  - **Audience**: owner; edge cases `orders.view`
  - **Output**: `docs/guides/merchant/11-shipping/zone-review-and-edge-cases.md`
  - **Must cover**:
    - Orders flagged inside a restricted polygon or outside every active Sharwa Ship zone; resolve by confirm / convert to pickup / cancel waybills (fees waived, order kept); orders without coordinates listed but not drawn.
    - Edge cases list: out-of-order / flagged / rejected shipment events with readable notes, and SLA breaches.
  - **Screenshots**: zone review map, edge cases list
  - **Done when**: both screens documented.
  - **Status**: written in official Step 34 (2026-10-28): `zone-review-and-edge-cases.md` — review candidates and the two reasons (500 m buffer, official method), orders without coordinates listed not drawn, confirm / convert to pickup / cancel (waybills cancelled with fees waived, order kept, never returns to the queue), the 409 for an order cancelled meanwhile; edge-case tabs with counts, every note text, sources, the `orders.view`/`orders.update_status` split. No new discrepancy. Left open: screenshots `zone-review-and-edge-cases-1`, `-2` registered, not captured.

- [x] **DOC-378** — Document changing an address in transit and converting to pickup
  - **Source**: INT-021 (M15) · inventory Domain 11
  - **Audience**: owner, `orders.update_status`
  - **Output**: `docs/guides/merchant/11-shipping/address-and-convert-to-pickup.md`
  - **Must cover**:
    - Address update only while in transit (recorded on the order timeline); convert to pickup blocked from «picked up» on, cancels pending-label waybills; conflict if the order changed.
  - **Screenshots**: address dialog, convert dialog
  - **Done when**: both actions documented.
  - **Status**: written in official Step 34 (2026-10-28): `address-and-convert-to-pickup.md` — availability per shipment status with the block sentences, address change only in transit (≥ 8 chars, both coordinates or none, merchant_manual event, timeline note), convert blocked from «تم الاستلام» on, cancels label-pending/pending-pickup waybills with fees waived, the version conflict panel, marketplace refusal. No new discrepancy. Left open: screenshots `address-and-convert-to-pickup-1`, `-2` registered, not captured.

- [x] **DOC-379** — Document issuing Sharwa Ship waybills
  - **Source**: INT-047 (M39) · inventory Domain 11
  - **Audience**: owner (writes), `orders.view` (read); plan feature `sharwa_ship`
  - **Output**: `docs/guides/merchant/11-shipping/sharwa-ship-issue-waybill.md`
  - **Must cover**:
    - Pending orders list (newest 50) with weight preview and expected waybill count; choose zone and issue; the fee is debited from your store's Sharwa Pay wallet; heavy shipments are split into a master + children; weight/hazard/marketplace errors shown.
    - Messages «ميزة شروة شيب غير مفعّلة لمتجرك.», «ليست لديك صلاحية لعرض الشحنات.», «هذا الإجراء مقصور على مالك المتجر.».
  - **Screenshots**: pending orders, issue dialog
  - **Done when**: issuance documented including billing.
  - **Status**: written in official Step 34 (2026-10-28): `sharwa-ship-issue-waybill.md` — pending list (newest 50) with the weight triple and split plan, zone choice and issue, Sharwa Pay debit per waybill with its description, master/children split by the courier limits, all-or-nothing rollback, every issue error and the three gate sentences. Discrepancy: the mock refuses a heavy order instead of splitting it (the sheet then suggests splitting); only the first sub-shipment is issued. Left open: screenshots `sharwa-ship-issue-waybill-1`, `-2` registered, not captured.

- [x] **DOC-380** — Document managing Sharwa Ship shipments
  - **Source**: INT-047 (M39) · inventory Domain 11
  - **Audience**: owner, `orders.view`
  - **Output**: `docs/guides/merchant/11-shipping/sharwa-ship-shipments.md`
  - **Must cover**:
    - Shipments list (masters) with filters status/billing/carrier/search/dates and counts; detail with children, items, COD, events with actor and location, allowed transitions; a refused status change shows its reason; assigning an agent.
  - **Screenshots**: shipments list, detail
  - **Done when**: shipments screens documented.
  - **Status**: written in official Step 34 (2026-10-28): `sharwa-ship-shipments.md` — the two status axes, counters, filters status/billing/carrier/search, masters only with «رئيسة · N فرعية», waybill page (facts, children, items, COD, events with source, actor, location and flags), manual status (owner only, refused reasons), the transition diagram, assignment via supervision. Discrepancy: no date filter in the screen although the API accepts from/to. Left open: screenshots `sharwa-ship-shipments-1`, `-2` registered, not captured.

- [x] **DOC-381** — Document the AWB queue and rate cards
  - **Source**: INT-047 (M39) · inventory Domain 11
  - **Audience**: owner
  - **Output**: `docs/guides/merchant/11-shipping/awb-queue-and-rate-cards.md`
  - **Must cover**:
    - Failed waybill issuances and «إعادة المحاولة» (failed only; retried in the background); notifications «awb_failed».
    - Rate cards: price drift vs last confirmed; never-confirmed = awaiting.
  - **Screenshots**: AWB queue, rate cards
  - **Done when**: both documented.
  - **Status**: written in official Step 34 (2026-10-28): `awb-queue-and-rate-cards.md` — queue columns and statuses, «إعادة المحاولة» for failed rows only (background, retries every pending row, Beat every 15 min), the `awb_failed` bell notification (title, body, link, `orders.view`, resolves itself), rate-card drift and «بانتظار تأكيد التسعيرة» (>10% or never confirmed). Discrepancy (step 26): the queue lists every status, not failed only. Left open: screenshots `awb-queue-and-rate-cards-1`, `-2` registered, not captured.

- [x] **DOC-382** — Document courier supervision and emergency reassignment
  - **Source**: INT-047 (M39), INT-046 · inventory Domain 11
  - **Audience**: owner; opens with `sharwa_ship` or local delivery providers («الإشراف على المندوبين يتطلب «شروة شيب» أو التوصيل المحلي.»)
  - **Output**: `docs/guides/merchant/11-shipping/courier-supervision.md`
  - **Must cover**:
    - Agents with open shift, active fulfilments, cash balance; waybills without an agent; last 100 COD reversals; agent shifts list.
    - Emergency reassign moves fulfilments and custody to another agent (shows moved shipments and amount).
    - Works for stores using their own local couriers too.
  - **Screenshots**: supervisor dashboard, reassign dialog
  - **Done when**: supervision documented.
  - **Status**: written in official Step 34 (2026-10-28): `courier-supervision.md` — dual feature gate and owner-only messages, agents with shift/open shipments/custody, unassigned waybills (≤ 100, empty without `sharwa_ship`) and «إسناد», last 100 reversals, emergency reassignment (moved count and amount, «طوارئ» shifts, ledger pair, shipments moved), the shift log (last 200), local-courier stores. Discrepancy (step 26, repeated): the transfer ledger pair is written in SAR. Left open: screenshots `courier-supervision-1`…`-3` registered, not captured.

### 2.12 Courier app guide (تطبيق المندوب)
Domain 11 — M38 for delivery agents.

- [x] **DOC-383** — Document courier sign-in and the home screen
  - **Source**: INT-046 (M38), INT-003 · inventory Domain 11, A.4
  - **Audience**: courier
  - **Output**: `docs/guides/courier/11-shipping/sign-in-and-home.md`
  - **Must cover**:
    - Sign in with the staff phone + password linked to a delivery provider profile; owner accounts get «هذا التطبيق لحسابات المندوبين…»; staff without a profile or with an inactive profile are refused.
    - Home: agent name, open shift, cash balance (one total per currency).
  - **Screenshots**: agent home
  - **Done when**: access rules and home explained.
  - **Status**: written in official Step 34 (2026-10-28): `courier/11-shipping/sign-in-and-home.md` — staff phone + password via staff login, linking by the owner, the three refusal sentences, top bar, «رصيد العهدة» one total per currency, open shift, bottom tabs, offline work and the «الطابور» tab (states, sync, same-id retry, 7-day expiry, session expiry). No new discrepancy. Left open: screenshots `sign-in-and-home-1`, `-2` registered, not captured.

- [x] **DOC-384** — Document courier shifts: start, end and handover
  - **Source**: INT-046 (M38) · inventory Domain 11
  - **Audience**: courier
  - **Output**: `docs/guides/courier/11-shipping/shifts.md`
  - **Must cover**:
    - Start shift (closes a previous open shift); end and hand over to another active agent (not yourself); a closed shift can't be ended again; what moves on handover (your shipments and custody).
  - **Screenshots**: shift start/end
  - **Done when**: shift steps documented.
  - **Status**: written in official Step 34 (2026-10-28): `courier/11-shipping/shifts.md` — start (closes a previous open shift without moving anything), end, handover by agent number (not yourself, active only), closed shift cannot be ended again, what moves (shift, custody pair with its notes, open shipments), errors, offline notes. Discrepancy: the handover line labels the receiver's total balance as «العهدة المنقولة»; the app shows no colleague numbers. Left open: screenshot `shifts-1` registered, not captured.

- [x] **DOC-385** — Document courier shipments: list, scan pickup, status updates, partial delivery
  - **Source**: INT-046 (M38) · inventory Domain 11
  - **Audience**: courier
  - **Output**: `docs/guides/courier/11-shipping/shipments.md`
  - **Must cover**:
    - Tabs (4 + other) with counts; only your own shipments; detail with items, COD amount, allowed next statuses, events.
    - Scan pickup; update status; partial delivery with delivered quantities/reasons and collected amount.
  - **Screenshots**: shipments tabs, detail, partial delivery form
  - **Done when**: every courier action documented.
  - **Status**: written in official Step 34 (2026-10-28): `courier/11-shipping/shipments.md` — tabs (4 + «أخرى») with counts, own shipments only, detail (COD, items, events), scan pickup (verify only, mismatch), transition buttons per status and rejection texts, delivery and collection with reasons, geofence flag, returns for rejected lines, offline behaviour. Discrepancies: an all-rejected delivery still ends «تم التسليم»; `geo_required` shows only a generic refusal (step 26). Left open: screenshots `shipments-1`…`-3` registered, not captured.

- [x] **DOC-386** — Document courier custody (العهدة)
  - **Source**: INT-046 (M38) · inventory Domain 11
  - **Audience**: courier
  - **Output**: `docs/guides/courier/11-shipping/custody.md`
  - **Must cover**:
    - Custody ledger (50 per page, +/−, linked waybill); balance per currency; handing over custody.
  - **Screenshots**: custody list
  - **Done when**: custody explained.
  - **Status**: written in official Step 34 (2026-10-28): `courier/11-shipping/custody.md` — balance per currency, ledger entry types with signs and notes, linked waybill and shift, handing over to a colleague or by emergency reassignment. Discrepancy: the app shows only the first 50 entries (no page control); the transfer pair is written in SAR. Left open: screenshot `custody-1` registered, not captured.

### 2.13 Settings, staff & permissions, domains & integrations (الإعدادات والفريق والتكاملات)
Domain 12.

- [x] **DOC-387** — Document store settings: identity, contact, policies
  - **Source**: INT-010 (M34) · inventory Domain 12
  - **Audience**: owner; text sections also `catalog.manage`; plan features `contact_info`, `store_policies`
  - **Output**: `docs/guides/merchant/12-settings-staff-integrations/settings-identity-contact-policies.md`
  - **Must cover**:
    - Each section's fields; store URL from the primary domain; pending-payment orders notice; contact links and about/return policy appear on the storefront (return policy excerpt on tracking); field errors per field.
  - **Screenshots**: each section
  - **Done when**: every field explained.
  - **Status**: written in official Step 35 (2026-10-28): `settings-identity-contact-policies.md` — the settings hub and its two groups, auto-save states and the 5 s retry, who may edit (owner or `catalog.manage`), «الهوية» (name 3–100, about ≤ 2000), «التواصل» (WhatsApp normalisation 967/966, e-mail, read-only «النطاق الخاص», four links), «السياسات» (≤ 10000, Markdown hints, preview), where each field appears on the storefront (footer, about page, WhatsApp button, return-policy excerpt on tracking), the store URL from the primary domain. Discrepancies: the «إدارة النطاقات» link points to a non-existent /dashboard/domains; the UI grants editing by role name while the server checks `catalog.manage`; the pending-payment orders count is returned but never shown. Left open: screenshots `-1`…`-3` registered, not captured.

- [x] **DOC-388** — Document currency & FX, SEO, timezone and week start settings
  - **Source**: INT-010 (M34) · inventory Domain 12
  - **Audience**: owner; plan features `currency_settings`, `seo_settings`
  - **Output**: `docs/guides/merchant/12-settings-staff-integrations/settings-currency-seo.md`
  - **Must cover**:
    - Store currency, FX rates with 4 decimals (e.g. 3.7525) and the 100 SAR preview; amounts displayed in YER (عدن) in this screen.
    - SEO title/description and share image (upload, keep, remove).
    - Timezone (used by bookings, rosters, rollup ranges) and week start.
  - **Screenshots**: currency section with preview, SEO section
  - **Done when**: documented.
  - **Status**: written in official Step 35 (2026-10-28): `settings-currency-seo.md` — the four currencies and their Arabic names, the three rates with 4 decimals and defaults, the 100 ر.س preview, explicit save with confirmation and the unsaved bar; SEO fields and limits, share image upload/keep/remove (5 MB, 40 M pixels, request ≤ 8 MB), the search-result preview; timezone (reports, bookings, roster login) and week start. No new discrepancy. Left open: screenshots `-1`, `-2` registered, not captured.

- [x] **DOC-389** — Document staff members: invite, edit, terminate, temporary passwords
  - **Source**: INT-022 (M18) · inventory Domain 12
  - **Audience**: owner, `staff.view` / `staff.manage`; plan feature `staff_rbac`
  - **Output**: `docs/guides/merchant/12-settings-staff-integrations/staff-members.md`
  - **Must cover**:
    - Adding a member by phone (any number form; duplicates detected); the temporary password is shown once («كلمة مرور مؤقتة جديدة» issues another and signs them out everywhere).
    - Termination is soft (cannot sign in, sessions and tokens revoked, audited); you can't terminate yourself; counters.
  - **Screenshots**: staff list, create sheet, PasswordOnce dialog
  - **Done when**: staff lifecycle documented.
  - **Status**: written in official Step 35 (2026-10-28): `staff-members.md` — list, status strip and search by any phone form, add by phone (967/966, duplicates in any form), the one-time temporary password (format, copy, no recovery) and «كلمة مرور مؤقتة جديدة», edit, revoke all sessions, soft termination (sessions and tokens revoked, history kept, audited, not yourself), the sidebar counters. Discrepancies: self-termination answers 400 not the 403 self-edit rule (step 27); the empty state says staff log in with a verification code; no termination reason field. Left open: screenshots `-1`…`-3` registered, not captured.

- [x] **DOC-390** — Document roles, assignments, permission overrides and effective permissions
  - **Source**: INT-022 (M18) · inventory Domain 12
  - **Audience**: owner, `staff.manage_roles`, `staff.manage_assignments`
  - **Output**: `docs/guides/merchant/12-settings-staff-integrations/roles-and-assignments.md`
  - **Must cover**:
    - System roles read-only; custom roles; deleting a role assigned to staff refused (staff listed); a role used as an approver role can't be deleted.
    - Assignments per location, overrides (global or per location); nobody can edit their own assignments/overrides; effective permissions view; permission categories shown in Arabic.
  - **Screenshots**: roles screen, effective permissions
  - **Done when**: RBAC screens documented.
  - **Status**: written in official Step 35 (2026-10-28): `roles-and-assignments.md` — system roles read-only and «نسخ كدور مخصص», custom role form (name, POS discount ceiling, grouped Arabic categories, reports suggestion), delete refused when assigned (staff listed) or used as an approver role, assignments per location (permission and operational role, replace-all save), overrides (grant/revoke, revoke wins), «الصلاحية النهائية» sources, no self-editing. Discrepancies: overrides can only be global, not per location; the overrides tab is enabled by `staff.manage` while the server checks `staff.manage_assignments`. Left open: screenshots `-1`…`-4` registered, not captured.

- [x] **DOC-391** — Document sessions, access tokens, trusted devices and the roster
  - **Source**: INT-022 (M18) · inventory Domain 12
  - **Audience**: owner, `staff.view_sessions` / `staff.manage`
  - **Output**: `docs/guides/merchant/12-settings-staff-integrations/sessions-tokens-devices-roster.md`
  - **Must cover**:
    - Active sessions with device labels; end one or all («revoke sessions»).
    - Personal access tokens (`shw_pat_…` shown once, 90-day expiry, last used); trusted devices (remove = deactivate, last seen).
    - Weekly roster grid (store-wide; logins outside it refused).
    - IP allow-list: the toggle and warning exist but addresses can't be entered yet (known limitation).
  - **Screenshots**: sessions tab, tokens, roster grid
  - **Done when**: each security screen documented.
  - **Status**: written in official Step 35 (2026-10-28): `sessions-tokens-devices-roster.md` — active sessions with device labels and end one/all, personal tokens (`shw_pat_`, shown once, 90 days, last used), trusted devices (remove = deactivate), the store-wide weekly roster (login only, store timezone, no overnight shifts), the IP allow-list toggle. Known limitations: tokens accepted by no route, IP list cannot be entered, an empty roster does not restrict. Discrepancies: session ending is enabled by `staff.manage` while the server checks `staff.view_sessions`; the devices empty state promises a verification code. Left open: screenshots `-1`, `-2` registered, not captured.

- [x] **DOC-392** — Document the approvals queue
  - **Source**: INT-022 (M18), INT-024, INT-033, INT-035, INT-044 · inventory Domain 12
  - **Audience**: approvers (role at the location or `staff.manage`), owner
  - **Output**: `docs/guides/merchant/12-settings-staff-integrations/approvals.md`
  - **Must cover**:
    - Request types: write-offs, POS shift shortages, POS discount exceptions («خصم 15% في نقطة البيع يتجاوز حد الدور (10%)»), purchase orders, B2B drafts; summary/linked entity (shown unavailable if gone); owner decisions shown as «مالك المتجر».
    - No self-approval; conflict if decided elsewhere; deciding updates the linked order/PO/shift.
  - **Screenshots**: approvals list with each type
  - **Done when**: every approval type documented.
  - **Status**: written in official Step 35 (2026-10-28): `approvals.md` — the six request types with their summaries (incl. «خصم (النسبة)% في نقطة البيع يتجاوز حد الدور ((الحد)%)»), what approve/reject does to the linked write-off/shift/POS discount/PO/B2B order, entity unavailable, owner shown as «مالك المتجر», no self-approval, the 409 conflict panel, decision and effect in one transaction, write-off re-check. Discrepancies: the screen lets only the owner or `staff.manage` decide (the approver role may too) and calls the note optional although a rejection needs one; `refund` requests have no creator and escalation is never set (step 27). Left open: screenshots `-1`, `-2` registered, not captured.

- [x] **DOC-393** — Document the audit log and behaviour alerts
  - **Source**: INT-022 (M18), INT-017 · inventory Domain 12
  - **Audience**: `staff.view_sessions` or `reports.sales.view` (audit), owner
  - **Output**: `docs/guides/merchant/12-settings-staff-integrations/audit-and-alerts.md`
  - **Must cover**:
    - Audit log read-only; «تحقق من السلسلة» shows where the chain breaks (row number).
    - Behaviour alerts (value vs limit, e.g. viewing/export volume) with warning/critical; mark read; alerts of removed members shown without actions.
  - **Screenshots**: audit log, alerts
  - **Done when**: documented.
  - **Status**: written in official Step 35 (2026-10-28): `audit-and-alerts.md` — read-only audit log (columns, search, what is recorded), chain verification and the meaning of the break position, behaviour alerts (three types, daily thresholds 1000/5000/200, levels, unread first, «الجلسات», mark read, removed members without actions). Discrepancies: the button is «التحقق من سلامة السجل», not «تحقق من السلسلة»; «تعليم كمقروء» is enabled by `staff.manage` while the server checks `staff.view`; the screen has no actor/action/date filters. Left open: screenshots `-1`, `-2` registered, not captured.

- [x] **DOC-394** — Document connecting a custom domain (DNS steps)
  - **Source**: INT-023 (M19) · inventory Domain 12
  - **Audience**: owner only
  - **Output**: `docs/guides/merchant/12-settings-staff-integrations/custom-domain.md`
  - **Must cover**:
    - Your subdomain row is always there (read-only); add up to 5 domains (format errors, duplicates, already used by another store refused).
    - DNS records to create at your registrar: CNAME (subdomain) or A record (apex) to the Sharwa edge, plus TXT `_sharwa.<host>` for ownership.
    - Verify → failed with a reason, or verifying → active once HTTPS works (certificate issuance may take time); set primary (only active; 0 = back to subdomain); delete (not the subdomain or the primary).
  - **Screenshots**: domains list, DNS records card
  - **Done when**: a merchant can connect a domain end-to-end.
  - **Status**: written in official Step 35 (2026-10-28): `custom-domain.md` — the read-only subdomain, add (format rules, duplicates, other store, max 5), the DNS records (CNAME or A plus TXT `_sharwa.<host>`), verify and the four statuses with their texts, set primary (active only; subdomain = back), delete (not the subdomain or the primary), manual certificate issuance and the stale routing after a later DNS failure. No new discrepancy. Left open: screenshots `-1`, `-2` registered, not captured.

- [x] **DOC-395** — Document tracking pixels and conversions
  - **Source**: INT-023 (M19) · inventory Domain 12
  - **Audience**: owner; plan feature `tracking_tools`
  - **Output**: `docs/guides/merchant/12-settings-staff-integrations/tracking-pixels.md`
  - **Must cover**:
    - GTM, Meta, TikTok, Snap, Google (gtag) ids ≤ 50 chars, Ads label ≤ 100, no spaces or `<>"'`; CAPI tokens write-only (10–255 chars; empty keeps, clear removes).
    - Pixels load on every storefront page (page views on navigation, not in theme preview); Google Ads purchase conversion fires once per order on the success page.
  - **Screenshots**: tracking form
  - **Done when**: pixel setup documented.
  - **Status**: written in official Step 35 (2026-10-28): `tracking-pixels.md` — the switch, the seven ids in four groups with format examples and the non-blocking warning, the two write-only server tokens (10–255, empty keeps, remove), loading on every storefront page but not in the dashboard or theme preview, page views on navigation, the Google Ads purchase conversion once per order. Discrepancy: the «قيد التكامل» tag on the four M19 screens says the backend is not available although it is. Left open: screenshot `-1` registered, not captured.

- [x] **DOC-396** — Document outgoing webhooks for merchants
  - **Source**: INT-023 (M19) · inventory Domain 12
  - **Audience**: owner (and their developer)
  - **Output**: `docs/guides/merchant/12-settings-staff-integrations/webhooks.md`
  - **Must cover**:
    - HTTPS URLs only (internal addresses refused); secret `whsec_…` shown once (on create/rotate); events order.created, order.status_changed, order.fulfillment_changed, order.refunded, shipment.event, product.updated, inventory.low_stock.
    - Signature header explanation (link to API docs); 3 automatic attempts (now, +1 min, +5 min); disabled automatically after 10 consecutive failures (re-enable resets); delivery log with filters; redeliver failed; send test event.
  - **Screenshots**: webhooks list, delivery log
  - **Done when**: merchant-facing webhook management documented.
  - **Status**: written in official Step 35 (2026-10-28): `webhooks.md` — the seven events, create (https only, internal addresses refused, events, description), the `whsec_` secret shown once, list columns and states, edit/enable/disable/delete, test event, rotation, delivery log with filters and redeliver, signature header with a link to the integrator pages, 3 attempts (now, +1 min, +5 min), auto-disable after 10 failures and re-enable reset, limit 10 endpoints. Discrepancy: the screen says failed sends are retried up to 5 times; the server makes 3 attempts. Left open: screenshots `-1`…`-3` registered, not captured.

- [x] **DOC-397** — Document the integrations status overview
  - **Source**: INT-023 (M19) · inventory Domain 12
  - **Audience**: owner, staff (rows filtered by permission)
  - **Output**: `docs/guides/merchant/12-settings-staff-integrations/integrations-status.md`
  - **Must cover**:
    - 13 status rows (apps, channels health, marketplaces, suppliers, carriers); out-of-plan rows marked unavailable; links to fix.
  - **Screenshots**: integrations status page
  - **Done when**: each row's meaning documented.
  - **Status**: written in official Step 35 (2026-10-28): `integrations-status.md` — the 13 rows by group with their staff permission and plan feature, statuses and «غير متاح في خطتك», last event, the error reasons, «إدارة» links, the owner-only «الربط الصادر والتتبع» section, rows never shown to staff. No new discrepancy. Left open: screenshot `-1` registered, not captured.

### 2.14 Sales channels & operations (القنوات والأسواق والدروبشيبينغ ونقطة البيع والحجوزات)
Domain 13.

- [x] **DOC-398** — Document the unified inbox: conversations and replies
  - **Source**: INT-037 (M27) · inventory Domain 13
  - **Audience**: owner, `channels.inbox.access` (+ per-channel access); plan feature `social_channels`
  - **Output**: `docs/guides/merchant/13-channels-operations/inbox.md`
  - **Must cover**:
    - Counters, conversation list by channel (Facebook, Instagram, TikTok, Telegram, WhatsApp); hidden channels per your access; can't reply without reply access.
    - Reply shows «جارٍ الإرسال» then sent/failed with the provider's reason (e.g. Meta's 24-hour window); retries never duplicate; quick-reply templates via «/»; send a product card; disconnected channel «القناة غير مربوطة — لا يمكن الردّ.».
    - New messages reopen resolved/pending conversations; unread inbox notifications.
  - **Screenshots**: inbox list, thread with product card
  - **Done when**: inbox operations documented.
  - **Status**: written in official Step 48 (2026-10-29): `docs/guides/merchant/13-channels-operations/inbox.md` — the list with the five channel names, filters and «انقطع التحديث — إعادة المحاولة»; per-channel visibility (hidden channels, counter limited to visible channels); reply flow «جارٍ الإرسال» → «مُرسَلة»/«تم التوصيل»/«مقروءة»/«فشلت» with the provider's reason (Meta 24-hour window as the example); transport retries never duplicate (same client id) while «إعادة المحاولة» on a failed bubble sends a new message; «/» templates (title or body, 6 matches); product card sent on pick; status/assign toasts and J/K/E/A/O shortcuts; the read-only reasons «القناة غير مربوطة — لا يمكن الردّ.» and the view-only sentence; reopen on inbound; the «رسائل جديدة من …» notification; 2 screenshot placeholders registered, not captured; one minor (empty-state text omits WhatsApp; WhatsApp is connected through the WhatsApp app).

- [x] **DOC-399** — Document converting a chat to an order
  - **Source**: INT-037 (M27) · inventory Domain 13
  - **Audience**: inbox members
  - **Output**: `docs/guides/merchant/13-channels-operations/chat-to-order.md`
  - **Must cover**:
    - Product picker; stock is reserved and decremented (shortage → backordered, not refused); order in store currency with sales channel «chat»; already linked → «المحادثة مرتبطة بالطلب #…»; confirmation message posted in the thread; timeline event.
  - **Screenshots**: convert dialog
  - **Done when**: documented.
  - **Status**: written in official Step 48 (2026-10-29): `docs/guides/merchant/13-channels-operations/chat-to-order.md` — needs reply access; the dialog fields and the 967/966 phone rule; server-side prices in the store currency; stock decremented at once, a shortage creates a backordered order instead of refusing; sales channel chat + channel traffic source + the channel's default status; «المحادثة مرتبطة بالطلب #… مسبقاً.»; the bot confirmation with the tracking link (only when the channel is connected); the timeline event «أُنشئ من محادثة #….»; 1 screenshot placeholder registered, not captured; one — the dialog says the server computes delivery fees but the chat order total is the item subtotal (shown as «قيد معروف»); roadmap's 'reserved' is a direct decrement.

- [x] **DOC-400** — Document connecting social channels (Meta, TikTok, Telegram, WhatsApp)
  - **Source**: INT-037 (M27) · inventory Domain 13
  - **Audience**: owner («إعدادات القنوات لمالك المتجر فقط.»)
  - **Output**: `docs/guides/merchant/13-channels-operations/connect-channels.md`
  - **Must cover**:
    - Meta/TikTok via OAuth: returns to the dashboard with success or an error toast; Telegram via bot token (invalid token error; no OAuth); disconnect clears credentials (conversations stay read-only); connection error state («unhealthy»).
  - **Screenshots**: channels page, Telegram token form
  - **Done when**: each channel connection documented.
  - **Status**: written in official Step 48 (2026-10-29): `docs/guides/merchant/13-channels-operations/connect-channels.md` — Meta/TikTok Shop OAuth round trip («رُبطت …» or the oauth_error text), Telegram bot token («رمز البوت غير صحيح — انسخه كما يعطيه @BotFather.»), disconnect confirmation (credentials cleared, conversations read-only), «خطأ في الربط» from the 15-minute health check with the four health messages, owner-only gate; 2 screenshot placeholders registered, not captured; one — the channels page has no WhatsApp row (connected through the WhatsApp app); the owner-only sentence differs between screen and API.

- [x] **DOC-401** — Document keyword triggers, reply templates and staff channel access
  - **Source**: INT-037 (M27) · inventory Domain 13
  - **Audience**: owner (templates list visible to all inbox members)
  - **Output**: `docs/guides/merchant/13-channels-operations/keywords-templates-access.md`
  - **Must cover**:
    - Keywords unique ignoring case and match type; templates (staff quick replies); staff access matrix per channel (view/reply, 4 channels saved together; no rows = all channels).
  - **Screenshots**: keywords, templates, access matrix
  - **Done when**: documented.
  - **Status**: written in official Step 48 (2026-10-29): `docs/guides/merchant/13-channels-operations/keywords-templates-access.md` — keywords unique ignoring case and match type, the three reply types, activate/delete; templates (60/1000 limits, used via «/» by all inbox members); the staff × 4 channels matrix with autosave, first change materialising all four rows, no rows = every channel, reply implies view; 3 screenshot placeholders registered, not captured; no discrepancies.

- [x] **DOC-402** — Document channel catalog sync and TikTok category mapping
  - **Source**: INT-037 (M27) · inventory Domain 13
  - **Audience**: owner
  - **Output**: `docs/guides/merchant/13-channels-operations/catalog-sync.md`
  - **Must cover**:
    - Run sync (refused when not connected/unhealthy), last run, per-status product report, per-product resync.
    - TikTok category mapping (starter list of categories).
    - Known limitation: Meta sync needs a Meta category mapping that no screen offers yet, so unmapped products report «لا يوجد ربط تصنيف…».
  - **Screenshots**: sync report, TikTok mapping
  - **Done when**: sync + limitation documented.
  - **Status**: written in official Step 48 (2026-10-29): `docs/guides/merchant/13-channels-operations/catalog-sync.md` — per-channel scope/categories/price adjustment (−50…50)/stock shield, run (refused when not connected or unhealthy), last run, the per-status product table with the error text and per-product «إعادة المزامنة», TikTok mapping (8-category starter list, saved codes kept as «تصنيف …»), and the Meta limitation «لا يوجد ربط تصنيف لهذا المنتج على هذه القناة.» as «قيد معروف»; 2 screenshot placeholders registered, not captured; no discrepancies.

- [x] **DOC-403** — Document marketplaces: connecting Amazon and Noon, settings
  - **Source**: INT-038 (M28) · inventory Domain 13
  - **Audience**: `channels.marketplaces.manage`; plan feature `marketplaces` («ميزة الأسواق الإلكترونية غير مفعّلة في خطتك.»)
  - **Output**: `docs/guides/merchant/13-channels-operations/marketplaces-connect.md`
  - **Must cover**:
    - Amazon via OAuth (amazon.sa pinned automatically), Noon via API key + seller id + country (SA/AE sets the currency); disconnect; re-authorisation needed state.
    - Settings: markup, FX, «auto push» = re-send price/stock changes of published listings (not publish new products), import marketplace-fulfilled orders toggle.
  - **Screenshots**: marketplaces page, noon dialog, settings
  - **Done when**: connection + settings documented.
  - **Status**: written in official Step 48 (2026-10-29): `docs/guides/merchant/13-channels-operations/marketplaces-connect.md` — permission + feature gate, Amazon OAuth pinned to amazon.sa (the non-participation refusal), Noon key + seller id + country SA/AE setting the currency (verified with Noon first), disconnect (listings kept), «يحتاج إعادة ربط», the settings table (currency, markup 0–500, FX from SAR, stock buffer, incoming order status, auto push = re-send price/stock of published listings only, inventory sync, order pull, FBA/FBN import for reports) and the server price preview; 3 screenshot placeholders registered, not captured; no discrepancies.

- [x] **DOC-404** — Document marketplace listings: identifiers, prices, push
  - **Source**: INT-038 (M28) · inventory Domain 13
  - **Audience**: `channels.marketplaces.manage`
  - **Output**: `docs/guides/merchant/13-channels-operations/marketplaces-listings.md`
  - **Must cover**:
    - A listing per product/variant per market (appear as «needs identifier»); identifiers (Amazon ASIN B0…/EAN 13/UPC 12/GTIN 8–14; Noon NSKU/EAN/GTIN); price = override or store price → SAR × FX × (1 + markup).
    - Push single/bulk (Amazon bulk feeds above 20, one bulk at a time); listings without identifiers reported as «NO-ID» errors.
  - **Screenshots**: listings table, push dialog
  - **Done when**: documented.
  - **Status**: written in official Step 48 (2026-10-29): `docs/guides/merchant/13-channels-operations/marketplaces-listings.md` — a listing per available product/variant per market starting «يحتاج معرّفاً», the six statuses, identifier formats per market (ASIN B0…, NSKU, EAN 13, UPC 12, GTIN 8–14), price override vs store price → SAR × FX × (1 + markup) with a worked example, push dialog, NO-ID errors, Amazon bulk feed above 20 and one bulk at a time, duplicate-SKU limit; 2 screenshot placeholders registered, not captured; no discrepancies.

- [x] **DOC-405** — Document marketplace jobs, orders and shipment confirmation
  - **Source**: INT-038 (M28) · inventory Domain 13
  - **Audience**: `channels.marketplaces.manage`
  - **Output**: `docs/guides/merchant/13-channels-operations/marketplaces-jobs-orders.md`
  - **Must cover**:
    - Jobs (counters, who triggered, summary, errors CSV); start order pull / FBA inventory (one at a time; FBA where supported); sync-failed notifications.
    - Marketplace orders with fulfilment and confirmation status; confirmation is automatic when tracking is entered; «إعادة تأكيد الشحنة» only for failed confirmations.
  - **Screenshots**: jobs list, marketplace orders
  - **Done when**: documented.
  - **Status**: written in official Step 48 (2026-10-29): `docs/guides/merchant/13-channels-operations/marketplaces-jobs-orders.md` — jobs table (8 types, 5 statuses, who triggered, duration, success/failed), the detail sheet with summary and errors CSV, manual order pull / FBA (Amazon only, one at a time), the «فشل مزامنة …» notification; marketplace orders with fulfilment, market status and confirmation status, automatic confirmation on tracking entry, «إعادة تأكيد» only for failed confirmations and its five refusals; 2 screenshot placeholders registered, not captured; one minor — the button reads «إعادة تأكيد», not «إعادة تأكيد الشحنة».

- [x] **DOC-406** — Document dropshipping: connecting suppliers and supplier settings
  - **Source**: INT-039 (M29) · inventory Domain 13
  - **Audience**: `channels.dropshipping.manage`; plan feature `dropshipping`
  - **Output**: `docs/guides/merchant/13-channels-operations/dropshipping-suppliers.md`
  - **Must cover**:
    - Supplier cards (CJ, مخازن, قنوات, flat feed) with attention counts; connect with the supplier's credential fields (verified first; rate-limit message); disconnect; «يتطلب إعادة الربط».
    - Settings: catalog/price sync intervals (≥ 60 min), inventory (≥ 15 min), «إحالة الطلبات» (auto-forward, COD auto-forward, default country, shipping method); «مزامنة المخزون الآن»; webhook URL + signing secret rotate (shown once) where supported.
  - **Screenshots**: suppliers page, connect form, settings
  - **Done when**: documented.
  - **Status**: written in official Step 48 (2026-10-29): `docs/guides/merchant/13-channels-operations/dropshipping-suppliers.md` — supplier rows (CJ, مخازن, كنوات, ملف مسطّح) with «تحتاج انتباهاً» and the attention banner, connect with the server-declared credential fields (verified first, rate-limit message), «يتطلب إعادة الربط», sync intervals (products/prices 60–10080, inventory 15–1440), stock buffer, hide when out of stock, «إحالة الطلبات» (auto-forward, COD, default country, shipping method), «مزامنة المخزون الآن», webhook rotate (URL + secret shown once), disconnect (imported products kept); 3 screenshot placeholders registered, not captured; one — the Knawat label is «كنوات» on screen but «قنوات» in the roadmap and Django's registry (and server messages built from it).

- [x] **DOC-407** — Document dropshipping catalog and product import
  - **Source**: INT-039 (M29) · inventory Domain 13
  - **Audience**: `channels.dropshipping.manage`
  - **Output**: `docs/guides/merchant/13-channels-operations/dropshipping-catalog.md`
  - **Must cover**:
    - Browse supplier catalog (CJ searched live, 24 per page), filters, import selected products (background job), import status.
  - **Screenshots**: catalog browser
  - **Done when**: documented.
  - **Status**: written in official Step 48 (2026-10-29): `docs/guides/merchant/13-channels-operations/dropshipping-catalog.md` — catalog columns (cost, suggested price after rules, variants, status), CJ searched live 24 per page vs mirrored catalogs, filters, import up to 500 as a background job, the four import statuses and «افتح في المنتجات», one import at a time; 1 screenshot placeholder registered, not captured; no discrepancies.

- [x] **DOC-408** — Document dropshipping pricing rules
  - **Source**: INT-039 (M29) · inventory Domain 13, A.6
  - **Audience**: `channels.dropshipping.manage`
  - **Output**: `docs/guides/merchant/13-channels-operations/dropshipping-pricing.md`
  - **Must cover**:
    - Scope all/supplier/category, «الأصغر أولاً» priority, FX source «اليومي» (store USD→SAR rate), shipping estimate, fixed add, min margin %; simulate (affected products) then apply (re-pricing job); periodic re-pricing at your interval; products with a supplier fixed price are locked.
  - **Screenshots**: rule form, simulation result
  - **Done when**: documented.
  - **Status**: written in official Step 48 (2026-10-29): `docs/guides/merchant/13-channels-operations/dropshipping-pricing.md` — the engine formula (cost → SAR, + shipping estimate, × markup, + fixed add, min-margin floor, rounding never below the floor) with a worked example, «يومي» = store USD→SAR (SAR/USD only) vs «ثابت» multiplying any cost, «الأصغر أولاً» priority and overlaps, simulate then apply (background re-pricing), periodic re-pricing through «مزامنة الأسعار», locked prices; 2 screenshot placeholders registered, not captured; one — the roadmap's 'supplier fixed price' lock is a manual price edit or a feed sale price; no unlock action in the dashboard (shown as «قيد معروف»); a «ثابت» rate also multiplies SAR costs.

- [x] **DOC-409** — Document product feeds (file or link)
  - **Source**: INT-039 (M29) · inventory Domain 13
  - **Audience**: `channels.dropshipping.manage`
  - **Output**: `docs/guides/merchant/13-channels-operations/dropshipping-feeds.md`
  - **Must cover**:
    - Upload a file or give a URL; map the 20 approved fields (required sku/name/cost/stock; variant_sku grouping; gtin, extra_images, brand, price fixed, compare_at_price, supplier_url); a column used twice refused; preview with row errors; approve needs ≤ 5% errors and contiguous parents; Run starts the import; schedules (60/360/720/1440 min) for link feeds only; errors CSV.
  - **Screenshots**: feed mapping, preview, schedule
  - **Done when**: documented.
  - **Status**: written in official Step 49 (2026-10-29): `docs/guides/merchant/13-channels-operations/dropshipping-feeds.md` — the feeds list and statuses; the four-step wizard (المصدر · الربط · المعاينة · التشغيل) for a file or a URL; the 20 target fields (required sku, name, cost, stock) with variant grouping via «SKU المتغير»; approval rules (≤ 5% errors, contiguous parent rows) with the live-rows rule; schedules 60/360/720/1440 min for URL feeds; limits 50MB / 200,000 rows / 200 columns; all server issue messages. Discrepancies: the wizard always uses the model defaults (no delimiter/encoding/currency/auto-import options) and feeds cannot be deleted or disabled although the limit is 20 active (both «قيد معروف»); the preview titled «بعد التحويل» shows raw cell values; the two errors-CSV shapes; 4 screenshots registered, not captured.

- [x] **DOC-410** — Document supplier orders and dropshipping jobs
  - **Source**: INT-039 (M29) · inventory Domain 13
  - **Audience**: `channels.dropshipping.manage`
  - **Output**: `docs/guides/merchant/13-channels-operations/dropshipping-orders-jobs.md`
  - **Must cover**:
    - Supplier orders with filters (status, supplier, attention) and resubmit.
    - Jobs (products, prices, inventory, import, feed) for one or all suppliers, retry, errors CSV.
    - Not available here (old screens only): address correction, poll now, cancel at supplier, cost-rise alerts / manual price unlock, feed delimiter/encoding options, per-product pricing rules.
  - **Screenshots**: supplier orders, jobs
  - **Done when**: documented.
  - **Status**: written in official Step 49 (2026-10-29): `docs/guides/merchant/13-channels-operations/dropshipping-orders-jobs.md` — the orders attention section, table and the 10 statuses, «إعادة الإرسال» only for held/failed; jobs by type and status with the per-type retry and the errors CSV (المرجع / الرمز / الرسالة); the «not available here» list as a «قيد معروف». Discrepancy: the jobs page has no type filter. 2 screenshots registered, not captured.

- [x] **DOC-411** — Document POS: access, registers and opening a shift
  - **Source**: INT-033 (M16) · inventory Domain 13
  - **Audience**: cashier/staff with a role at a POS location, owner; plan feature `pos`
  - **Output**: `docs/guides/merchant/13-channels-operations/pos-open-shift.md`
  - **Must cover**:
    - You only see registers at locations where you have a role and a POS terminal (owner: all); feature disabled response.
    - Open a shift with opening cash; reopening your own live shift continues it; «لديك وردية قائمة على …», «الجهاز مشغول بوردية …»; disabled register.
  - **Screenshots**: register picker, open-shift dialog
  - **Done when**: documented.
  - **Status**: written in official Step 49 (2026-10-29): `docs/guides/merchant/13-channels-operations/pos-open-shift.md` — how the store-host `/pos` is reached (no sidebar link), the plan-feature screens for owner and staff, the register list and its four states, opening a shift with the opening float, resuming your live shift, the pending-approval and force-closed notices, all server messages. Discrepancies: the empty state says «أضفها من المواقع» but no screen adds or disables registers; no sidebar entry (both «قيد معروف»). 2 screenshots registered, not captured.

- [x] **DOC-412** — Document POS selling and receipts
  - **Source**: INT-033 (M16) · inventory Domain 13
  - **Audience**: cashier
  - **Output**: `docs/guides/merchant/13-channels-operations/pos-sell.md`
  - **Must cover**:
    - Search/scan barcode; bundles, bookable and auction products not in the grid; quote; pay cash (into the drawer) or Sharwa Pay (recorded outside the drawer, no wallet debit); prices converted to store currency.
    - Each sale is a completed order with receipt number «POS-<shift>-<seq>», stock leaves the register's location, serialized units marked sold; double tap never sells twice; orders list and receipt view.
  - **Screenshots**: POS grid, cart, receipt
  - **Done when**: documented.
  - **Status**: written in official Step 49 (2026-10-29): `docs/guides/merchant/13-channels-operations/pos-sell.md` — search and barcode scan, the grid (bundles, bookable products, auctions, archived and unavailable products excluded), cart quantities and limits, cash and Sharwa Pay (one method per receipt), quote then complete, idempotent completion, receipt `POS-<shift>-<seq>` (zero-padded), stock and serial effects, offline cart behaviour, shortcuts and the receipts list. Discrepancy: the receipt number is zero-padded (POS-0012-003). 4 screenshots registered, not captured.

- [x] **DOC-413** — Document POS discounts, manager code and discount approvals
  - **Source**: INT-033 (M16) · inventory Domain 13
  - **Audience**: cashier with `discounts.apply`, managers
  - **Output**: `docs/guides/merchant/13-channels-operations/pos-discounts.md`
  - **Must cover**:
    - Your discount ceiling = highest role limit at this location; above it → «discount_exceeds_limit»; options: manager code (locks 15 min after 5 wrong tries per register) or request approval (pending/rejected/one receipt per approval).
    - How the owner sets the manager code (`set_pos_manager_code` by admin; test code under development only).
  - **Screenshots**: discount dialog, approval request
  - **Done when**: documented.
  - **Status**: written in official Step 49 (2026-10-29): `docs/guides/merchant/13-channels-operations/pos-discounts.md` — the discount ceiling (highest `Role.max_discount_percent` at the location, empty = none, owner none), line vs cart percent compared as the maximum, the manager-code path (5 wrong tries lock the register 15 min), the approval-request path («تحقّق وأتمّ», one receipt, up to the granted percent), the messages table. Discrepancies: `set_pos_manager_code` is a Django command with no screen, so the page tells the reader to ask support and does not name it; `discount_exceeds_limit` is a machine code the cashier never sees; the DEBUG test code is not published. 2 screenshots registered, not captured.

- [x] **DOC-414** — Document POS refunds and the large-refund code
  - **Source**: INT-033 (M16) · inventory Domain 13
  - **Audience**: cashier with `orders.refund`
  - **Output**: `docs/guides/merchant/13-channels-operations/pos-refunds.md`
  - **Must cover**:
    - Refund requires your open shift; cash refunds leave the drawer; above the threshold (default 200 store currency) a code is sent to the store WhatsApp (3 sends / 10 min; 3 wrong → locked 15 min).
  - **Screenshots**: refund + OTP dialog
  - **Done when**: documented.
  - **Status**: written in official Step 49 (2026-10-29): `docs/guides/merchant/13-channels-operations/pos-refunds.md` — the refund panel, the open-shift requirement, the OTP flow (threshold 200 store currency by default, code sent to the store WhatsApp, valid 5 min, bound to receipt + amount, 3 sends / 10 min, 3 wrong tries lock the receipt 15 min), cash vs Sharwa Pay effects, all messages. Discrepancies: the success toast «سُجِّل الاسترجاع في درج الكاش.» also shows for Sharwa Pay receipts, and the threshold has no screen (both «قيد معروف»). 2 screenshots registered, not captured.

- [x] **DOC-415** — Document POS cash movements, closing a shift, variance and force close
  - **Source**: INT-033 (M16), INT-022 · inventory Domain 13
  - **Audience**: cashier; variance deciders (owner, `staff.manage`, «مدير الفرع|المتجر»)
  - **Output**: `docs/guides/merchant/13-channels-operations/pos-close-shift.md`
  - **Must cover**:
    - Cash in/out with notes; close with counted cash; overage or exact → closed; shortage → «pending manager approval»; manager approves/rejects on the device or in approvals (either closes the shift; no self-approval); variance displayed as actual − expected; pending shifts list.
    - Force-closed shift notice shown until you open a new shift.
  - **Screenshots**: close shift, variance resolution
  - **Done when**: documented.
  - **Status**: written in official Step 49 (2026-10-29): `docs/guides/merchant/13-channels-operations/pos-close-shift.md` — cash in/out with the mandatory reason and the cash-out ceiling, the expected-closing formula, closing with the counted amount, shortage → «بانتظار اعتماد المدير» + the «عجز وردية» approval, manager resolution on the device or in the approvals page (both close the shift; no self-approval), the pending list, the force-close notice (12 h, checked every 30 min). Discrepancies: the screen shows variance as actual − expected while the approval carries the shortage as a positive amount; rejecting also closes the shift; no justification field on either side (both documented). 3 screenshots registered, not captured; the manager's pending list has no mock seed.

- [x] **DOC-416** — Document bookable services and availability (merchant)
  - **Source**: INT-036 (M26) · inventory Domain 13
  - **Audience**: any member who sees bookings; plan feature `bookings`
  - **Output**: `docs/guides/merchant/13-channels-operations/bookings-services.md`
  - **Must cover**:
    - Services list (active windows count); weekly availability windows (several per day; end after start; no overlap; weekday validation) replaced as a whole; paused windows untouched; slots every 30 min of the service duration, in the store timezone; products show as not bookable when the feature is off.
  - **Screenshots**: availability editor
  - **Done when**: documented.
  - **Status**: written in official Step 49 (2026-10-29): `docs/guides/merchant/13-channels-operations/bookings-services.md` — the services list and window counts, the weekly availability editor (several windows a day, end after start, no overlap, saved as a whole, max 70), paused windows untouched, 30-minute slot step over the service duration in the store timezone, the feature-off effect. Discrepancies: no booking permission key exists; the feature-off wording differs between screen and API; "products show as not bookable" is a route gate, not a product flag. 2 screenshots registered, not captured.

- [x] **DOC-417** — Document the bookings calendar and cancellation
  - **Source**: INT-036 (M26) · inventory Domain 13
  - **Audience**: members with bookings access
  - **Output**: `docs/guides/merchant/13-channels-operations/bookings-slots.md`
  - **Must cover**:
    - Slot list (date range, product, status held/booked, expired flag, customer or «زائر المتجر»); cancel («هذا الحجز ملغى مسبقاً.»), the linked order is not changed (shown); expired holds no longer block times.
  - **Screenshots**: slots list, cancel dialog
  - **Done when**: documented.
  - **Status**: written in official Step 49 (2026-10-29): `docs/guides/merchant/13-channels-operations/bookings-slots.md` — the week/day calendar (the Next.js screen is a calendar, not a list), filters and shortcuts, statuses held / booked / expired / cancelled, the slot detail sheet (customer or «زائر المتجر», phone, held until, linked order), cancel with the confirmation and the unchanged linked order, expired holds not blocking times. Discrepancy: the roadmap's "slot list with date range" is a calendar with arrow navigation. 2 screenshots registered, not captured.

### 2.15 Apps, Sharwa AI & support (التطبيقات والذكاء الاصطناعي والدعم)
Domain 14.

- [x] **DOC-418** — Document the App Store: browse, install, activate, deactivate
  - **Source**: INT-040 (M30) · inventory Domain 14
  - **Audience**: owner (writes), members read; plan feature `app_marketplace`
  - **Output**: `docs/guides/merchant/14-apps-ai-support/app-store.md`
  - **Must cover**:
    - Catalogue from the platform; price per store («مجاني» when not billed, install preview otherwise); install/activate/deactivate (already in that state → conflict); suspended by the platform → reason shown, cannot activate; delisted apps show «لم يعد متاحاً للتثبيت» and cannot be reinstalled.
    - App events history and charges.
  - **Screenshots**: app store grid, app detail
  - **Done when**: documented.
  - **Status**: written in official Step 47 (2026-10-29): `docs/guides/merchant/14-apps-ai-support/app-store.md` — catalogue rows with the per-store price («مجاني» / amount + «شهرياً»/«سنوياً»), the five states, install with the preview sentence, activate/deactivate with the deactivate confirmation, platform suspension (reason shown, controls disabled, «التطبيق معلَّق من المنصة — تواصل مع الدعم.»), delisted «لم يعد متاحاً للتثبيت» / no reinstall, «سجل التطبيق» event labels and «رسوم التطبيق» statuses, every conflict message; 2 screenshot placeholders; no discrepancies.

- [x] **DOC-419** — Document the WhatsApp app: connect, usage and summary
  - **Source**: INT-040 (M30) · inventory Domain 14
  - **Audience**: owner; app installed and active
  - **Output**: `docs/guides/merchant/14-apps-ai-support/whatsapp-app.md`
  - **Must cover**:
    - Connecting the store number via the SharwaConnect link; connection status.
    - Usage log filters (status, event type, dates) — events order new, shipping update, delivered, cancelled, payment confirmed, payment failed, manual — each linked to its order; summary.
    - Old QR pairing and monthly counter no longer used.
  - **Screenshots**: WhatsApp panel, usage log
  - **Done when**: documented.
  - **Status**: written in official Step 47 (2026-10-29): `docs/guides/merchant/14-apps-ai-support/whatsapp-app.md` — the installed-and-active gate, «افتح SharwaConnect» (one-time link), the «آخر 7 أيام» summary with «عرض الفاشلة», the usage log with status/event/date filters, the event and status tables (incl. «تم التوصيل», «إلغاء طلب», «تعذّر الدفع», «يدوي»), order links, the old QR pairing and monthly counter retired; 2 screenshot placeholders. **1 discrepancy**: no connection status on the panel — the connect link carries the live `connected` flag but the screen ignores it (HTML comment + «قيد معروف»).

- [x] **DOC-420** — Document WhatsApp message templates
  - **Source**: INT-040 (M30) · inventory Domain 14
  - **Audience**: owner
  - **Output**: `docs/guides/merchant/14-apps-ai-support/whatsapp-templates.md`
  - **Must cover**:
    - Six templates; variables `{{var}}`; required variables (order id, plus status label for shipping updates); unknown variables refused; 1024-character limit; preview with sample values; «نصّك المخصَّص / النص الافتراضي»; «استعادة النص الافتراضي» (empty = default).
  - **Screenshots**: template editor
  - **Done when**: documented.
  - **Status**: written in official Step 47 (2026-10-29): `docs/guides/merchant/14-apps-ai-support/whatsapp-templates.md` — the six templates with their variables and required ones (`{{order_id}}`, + `{{status_label}}` for shipping updates), «النص الافتراضي» / «نصّك المخصَّص», variable buttons, the 1024 limit, the server preview with sample values, «استعادة النص الافتراضي» (empty body = default; shown only on a custom text; clearing the editor and saving is refused by the required-variable check), every error sentence, owner-only editing; 1 screenshot placeholder; no discrepancies.

- [x] **DOC-421** — Document Sharwa AI: pairing, status, reconnect
  - **Source**: INT-041 (M31) · inventory Domain 14
  - **Audience**: owner (reconnect), members read; app installed and active
  - **Output**: `docs/guides/merchant/14-apps-ai-support/sharwa-ai-pairing.md`
  - **Must cover**:
    - First open starts pairing: QR with how-to-scan while «جارٍ الربط»; connected shows the paired number and time; failure states (disconnected, session expired, logged out, banned, failed) in Arabic with «إعادة الربط» (not while connected).
  - **Screenshots**: QR state, connected state, error state
  - **Done when**: documented.
  - **Status**: written in official Step 47 (2026-10-29): `docs/guides/merchant/14-apps-ai-support/sharwa-ai-pairing.md` — first open starts pairing («جارٍ الربط…» + QR + the scan hint), polling 5 s / 60 s (paused in a hidden tab), «مربوط» with number and «منذ …», the five failure states with their Arabic sentences, owner-only «إعادة الربط» (not while connected: «واتساب مربوط فعلاً.»), connected-at rule and the outage rule; 3 screenshot placeholders; no discrepancies.

- [x] **DOC-422** — Document Sharwa AI settings and opening the AI console
  - **Source**: INT-041 (M31) · inventory Domain 14
  - **Audience**: owner
  - **Output**: `docs/guides/merchant/14-apps-ai-support/sharwa-ai-settings-console.md`
  - **Must cover**:
    - AI on/off, max consecutive bot replies override 1–50 or platform default (4); saved all-or-nothing.
    - «فتح لوحة الذكاء» opens the AI console in a new window and signs you in securely (token never in the URL, expires ~15 minutes); unavailable message if the console isn't configured.
  - **Screenshots**: settings form, console button
  - **Done when**: documented.
  - **Status**: written in official Step 47 (2026-10-29): `docs/guides/merchant/14-apps-ai-support/sharwa-ai-settings-console.md` — «تفعيل المساعد», the 1–50 override with the platform default (4) as placeholder, all-or-nothing save, both range messages, the console button with the token-never-in-the-URL explanation, ~15-minute validity, popup-blocker message and both not-configured messages; 2 screenshot placeholders. **1 discrepancy**: the roadmap names the button «فتح لوحة الذكاء»; the code says «افتح وحدة تحكم شروة AI» (HTML comment; the page quotes the code).

- [x] **DOC-423** — Document support sessions: takeover, reply, release, close
  - **Source**: INT-042 (M32), INT-041 · inventory Domain 14
  - **Audience**: members (read), `support.takeover_session` (act), owner
  - **Output**: `docs/guides/merchant/14-apps-ai-support/support-sessions.md`
  - **Must cover**:
    - Sessions list order (escalated → human-locked → bot → closed), filters (status, type, assigned to me, search by phone/name), counters; AI installed/enabled indicator.
    - Timeline of messages, bot tool calls (secrets redacted) and quiet system events; attachments «فتح المرفق»; updates poll automatically.
    - Take over (who already holds it shown on conflict), reply (never duplicated), release, close; owner lock shown as «مالك المتجر».
  - **Screenshots**: sessions list, session timeline
  - **Done when**: documented.
  - **Status**: written in official Step 47 (2026-10-29): `docs/guides/merchant/14-apps-ai-support/support-sessions.md` — counters «مُصعَّدة»/«أتولّاها», the escalated → human-locked → bot → closed order, filters (status, type, «اسم أو هاتف»), the AI installed/disabled notices, timeline (messages, folded «أداة» rows with server-side redaction, quiet system events, «فتح المرفق (…)»), 10 s / 5 s polling, takeover / reply (never duplicated) / release / close with shortcuts, «يتولّاها (…)» and «مالك المتجر», every lock and reply message; 2 screenshot placeholders. **1 discrepancy**: the «مركز الدعم» sidebar group is gated on `support.takeover_session`, so read-only members lose the entry although the screen reads for everyone (HTML comment + «قيد معروف»).

- [x] **DOC-424** — Document support tickets
  - **Source**: INT-042 (M32) · inventory Domain 14
  - **Audience**: any member (no plan feature)
  - **Output**: `docs/guides/merchant/14-apps-ai-support/support-tickets.md`
  - **Must cover**:
    - Create (subject, description, optional customer phone), list filters (status, assigned to me/none/member, search), counters, edit status/assignee; closed date set/cleared with status; deactivated assignee shows «غير نشط» with a re-assign hint; any member can assign without staff permissions.
  - **Screenshots**: tickets list, ticket detail
  - **Done when**: documented.
  - **Status**: written in official Step 47 (2026-10-29): `docs/guides/merchant/14-apps-ai-support/support-tickets.md` — create (title ≤ 200, description ≤ 4000, optional phone, assignee), counters per status, filters (status, «المُسنَدة إليّ»/«غير مُسنَدة»/member, «العنوان أو المعرّف»), inline status change, sheet/full page with `S`/`A`, reopen confirmation, «أُغلقت» set/cleared with status, inactive assignee «غير نشط» + «المُسنَد إليه غير نشط — أعد الإسناد.», assignment without staff permissions, last write wins; the carried Step-10 sidebar note (tickets under «محفظة المتجر») as «قيد معروف»; 2 screenshot placeholders; no new discrepancies.

### 2.16 Reports (التقارير)
Domain 15 plus the browser-notifications card.

- [x] **DOC-425** — Document the reports catalogue and reading a report
  - **Source**: INT-027 (M25) · inventory Domain 15
  - **Audience**: owner, `reports.view` / `reports.sales.view`
  - **Output**: `docs/guides/merchant/15-reports/reports-overview.md`
  - **Must cover**:
    - The 42 reports by category with statuses (available, coming soon — e.g. AI forecasting —, disabled); WhatsApp costs available.
    - Location filter on sales overview, orders, store overview, best sellers when multi-location is on; refresh with the shared 5-minute cooldown.
  - **Screenshots**: reports registry, a report with location filter
  - **Done when**: documented.
  - **Status**: written in official Step 36 (2026-10-28): `reports-overview.md` — the index (search, hidden-reports note, disabled rows «قريباً» / «غير متاح بعد»), range presets with D/W/M/C keys and the mobile drawer, comparison, tiles/chart/table and 1000-row pages, the «الموقع» filter on the four location reports with the split-order counting rule, «تحديث بيانات اليوم» on the five core reports with the store-wide 5-minute cooldown shared with the overview, and the 42 reports in their 10 categories with status, server permission and export flag (36 available, 5 «غير متاح بعد», `ai_forecasting` «قريباً», `whatsapp_costs` available). Discrepancies: the UI adds `reports.view` and a stricter key on 3 reports (20 keys differ from Django); the refresh button shows on every core report but needs `reports.sales.view`; the hidden-reports note counts the inventory plan feature. Left open: screenshots `-1`, `-2` registered, not captured.

- [x] **DOC-426** — Document report exports and scheduled reports
  - **Source**: INT-027 (M25), INT-009 · inventory Domain 15
  - **Audience**: `reports.export`
  - **Output**: `docs/guides/merchant/15-reports/exports-and-schedules.md`
  - **Must cover**:
    - Exports include every page (no 1000-row cutoff) and keep the location filter; «export ready» notification to the requester; exports list `/reports/exports`; schedules.
  - **Screenshots**: exports list, schedule form
  - **Done when**: documented.
  - **Status**: written in official Step 36 (2026-10-28): `exports-and-schedules.md` — CSV/XLSX export from a report (toast, the per-report «تصديراتي» strip, 5 s polling), what the file holds (every page, range and location, raw numbers, watermark row, BOM, RTL sheet), «تصديراتي» at `/dashboard/reports/exports` (last 50, staff see their own), the five statuses, retry as a new job, 48 h expiry, the bell notification «التصدير جاهز للتحميل» / «فشل التصدير», and scheduled reports (dialog, pause/resume/delete, what is e-mailed, daily/weekly/30-day cadence). Discrepancies: the `orders` export ignores the location filter; the notification is derived by sync and also covers failures; the list route is `/dashboard/reports/exports`; the scheduled screen is gated on `reports.view` and lists non-exportable reports; the dialog promises 7 AM store time against a 03:00 UTC run; the range-too-long hint invites an export that then fails. Left open: screenshots `-1`, `-2` registered, not captured.

- [x] **DOC-427** — Document the browser notifications card (push stats and broadcast)
  - **Source**: INT-016 (M44) · inventory Domain 5
  - **Audience**: count: owner or `reports.view`; broadcast: owner only
  - **Output**: `docs/guides/merchant/15-reports/browser-notifications.md`
  - **Must cover**:
    - Active subscribers count; send a test/broadcast (title ≤ 60, body ≤ 200); refused with no subscribers; once per 60 seconds.
  - **Screenshots**: «إشعارات المتصفح» card
  - **Done when**: documented.
  - **Status**: written in official Step 36 (2026-10-28): `browser-notifications.md` — the «إشعارات المتصفح» card on the reports index: active subscriber count (owner or `reports.view`), the owner-only form (title ≤ 60, body ≤ 200), the queued-for toast, refusal with no subscribers, one broadcast per 60 seconds store-wide, staff refusal, dead subscriptions dropped. No discrepancy. Left open: screenshot `-1` registered, not captured.

### 2.17 Sharwa Pay customer guide (دليل محفظة شروة باي)
Domain 8 — M40 on the platform site.

- [x] **DOC-428** — Document Sharwa Pay sign-in with WhatsApp code
  - **Source**: INT-048 (M40) · inventory Domain 8
  - **Audience**: Sharwa Pay customer
  - **Output**: `docs/guides/sharwa-pay/08-finance/sign-in.md`
  - **Must cover**:
    - Only on the platform site (not on store sites); enter phone (local Yemeni numbers accepted), code valid 10 minutes; 3 sends per 10 minutes per number; 5 wrong codes → 5-minute lock (wait time shown); reasons no code / expired / invalid; WhatsApp failure; logout; «سجّل الدخول برقم جوالك.» when signed out.
    - Signing in does not create a wallet — the first top-up does.
  - **Screenshots**: login + code screens
  - **Done when**: documented.
  - **Status**: written in official Step 47 (2026-10-29): `docs/guides/sharwa-pay/08-finance/sign-in.md` — platform-origin only, «رقم الجوال» (local Yemeni / `967…` / `00967…`; Saudi `966…`), the code screen (6 boxes, paste, 10-minute countdown), 3 sends / 10 min, 5 wrong → 5-minute lock, the `no_code`/`expired`/`invalid` sentences, WhatsApp failure, logout, «سجّل الدخول برقم جوالك.», and sign-in creating no wallet (the first top-up request does); 2 screenshot placeholders; no discrepancies.

- [x] **DOC-429** — Document the Sharwa Pay wallet and transactions
  - **Source**: INT-048 (M40) · inventory Domain 8
  - **Audience**: Sharwa Pay customer
  - **Output**: `docs/guides/sharwa-pay/08-finance/wallet-and-transactions.md`
  - **Must cover**:
    - Four balances (SAR, USD, YER Sanaa, YER Aden); transactions filter by currency/reason (20 per page) with balance after, source store («متجر غير متاح» if missing/suspended), source order, linked request; suspended wallet «المحفظة موقوفة — تواصل مع الدعم.».
  - **Screenshots**: wallet, transactions
  - **Done when**: documented.
  - **Status**: written in official Step 47 (2026-10-29): `docs/guides/sharwa-pay/08-finance/wallet-and-transactions.md` — the four always-present balances, never converted or summed, the transactions page (currency/reason filters, 20 per page, «الرصيد بعدها», source store with «— متجر غير متاح», source order, linked request), the seven reason labels, suspended «المحفظة موقوفة — تواصل مع الدعم.», new-wallet and offline states; 2 screenshot placeholders. **1 discrepancy**: the roadmap (and the dashboard) say YER Sanaa / Aden; the wallet labels them «ريال يمني (قديم)» / «ريال يمني (جديد)» — quoted from the wallet, mapping explained in a note.

- [x] **DOC-430** — Document Sharwa Pay top-up and withdrawal requests
  - **Source**: INT-048 (M40), INT-031 · inventory Domain 8
  - **Audience**: Sharwa Pay customer
  - **Output**: `docs/guides/sharwa-pay/08-finance/topup-and-withdraw.md`
  - **Must cover**:
    - Top-up: bank transfer id (cannot reuse — even a rejected one), receipt image jpg/png/webp/gif ≤ 5 MB; status pending until the platform reviews; reviewed top-ups appear as «شحن بمراجعة».
    - Withdrawal: amount, currency, destination; debited immediately; «الرصيد غير كافٍ.»; refunded if rejected; requests list with rejection reason.
    - Paying store orders with Sharwa Pay at checkout.
  - **Screenshots**: top-up form, withdrawal form, requests
  - **Done when**: documented.
  - **Status**: written in official Step 47 (2026-10-29): `docs/guides/sharwa-pay/08-finance/topup-and-withdraw.md` — top-up (amount, currency, bank transaction id ≤ 100 and never reusable even after a rejection, optional note, receipt jpg/jpeg/png/webp/gif ≤ 5 MB that must be a real image), pending until reviewed, «شحن بمراجعة», «مقبول — بانتظار الإيداع»; withdrawal (amount ≤ balance, destination 6–255) debited at once with its confirmation sentence, «الرصيد غير كافٍ.», reversal on rejection; «طلباتي» with statuses and rejection reasons («رُفض الطلب.» default); paying at checkout linked to the buyer guide; every server message; 3 screenshot placeholders; no discrepancies.

### 2.18 Platform console manual (دليل لوحة مالك المنصة)
Domain 16 — `console.<base>`, owner «مالك المنصة» vs operator «مشرف تشغيلي».

- [x] **DOC-431** — Document console sign-in and roles
  - **Source**: INT-030 (M20) · inventory Domain 16, A.4
  - **Audience**: platform owner, platform operator
  - **Output**: `docs/guides/console/16-platform-console/sign-in-and-roles.md`
  - **Must cover**:
    - Console only on the platform domain; Django admin account (superuser = owner, staff = operator); lock after 5 failures per username for 15 minutes.
    - Operators read everything but write only dues and Sharwa Pay; other writes «هذا الإجراء لمالك المنصة فقط.»; every action recorded with «من نفّذ».
  - **Screenshots**: console login, header with role
  - **Done when**: documented.
  - **Status**: written in official Step 42 (2026-10-28): Arabic RTL from `guide-page.md`; role × write matrix, login messages incl. «محاولات دخول كثيرة — حاول بعد 15 دقيقة.», the read-only note «للقراءة فقط — هذا الإجراء لمالك المنصة.», «من نفّذ», ⌘K/G S/G D shortcuts; 2 screenshot placeholders.

- [x] **DOC-432** — Document the console overview and stores list
  - **Source**: INT-030 (M20) · inventory Domain 16
  - **Audience**: owner, operator
  - **Output**: `docs/guides/console/16-platform-console/overview-and-stores.md`
  - **Must cover**:
    - Overview totals (from daily snapshots), failed/stalled counts, pending top-ups/withdrawals/failed webhooks, last 50 stores.
    - Stores filters: status incl. stalled (pending > 5 min, provisioning > 20 min), plan incl. none, active, search (name/schema/domain/phone incl. 0777…), sorting; clients list; auto-refresh while pending.
  - **Screenshots**: overview, stores list
  - **Done when**: documented.
  - **Status**: written in official Step 42 (2026-10-28): «بانتظار قرار» queues, last-50 table, every filter incl. «بلا باقة» and the `0777…` search, 3-second auto-refresh, bulk actions; 1 discrepancy call-out: the UI filter label says «متعثّر (> 30 دقيقة)» while the server thresholds are 5/20 minutes (reported in Step 40).

- [x] **DOC-433** — Document re-provisioning failed/stalled stores
  - **Source**: INT-030 (M20) · inventory Domain 16
  - **Audience**: owner
  - **Output**: `docs/guides/console/16-platform-console/reprovision.md`
  - **Must cover**:
    - Only failed or stalled stores; per-store reasons when refused; status goes back to pending then ready.
  - **Screenshots**: reprovision dialog
  - **Done when**: documented.
  - **Status**: written in official Step 42 (2026-10-28): bulk dialog («المؤهَّل منها (فاشل أو متعثّر): N. البقية تُرفض بسببها.») and single-store path with the disabled tooltip, per-store server reasons, status flip and 3-second polling; no discrepancies.

- [x] **DOC-434** — Document the store detail: domains, Sharwa Ship enablement, features
  - **Source**: INT-030 (M20) · inventory Domain 16
  - **Audience**: owner (writes)
  - **Output**: `docs/guides/console/16-platform-console/store-detail.md`
  - **Must cover**:
    - Domains, subscriptions current + history, installations, overrides count, last 20 actions.
    - Enable/disable Sharwa Ship («قيد التفعيل/الإلغاء» up to 10 minutes; refused when the store's `sharwa_ship` feature is off).
    - Per-store feature switches with the deciding source; domain management (reserved names refused, primary switch); notes ≤ 255.
  - **Screenshots**: store detail tabs
  - **Done when**: documented.
  - **Status**: written in official Step 42 (2026-10-28): header + six tabs, Sharwa Ship toggle with «قيد التفعيل/الإلغاء» 10-minute marker and both impact sentences, features tab with «موروثة/تجاوز تفعيل/تجاوز تعطيل» and the deciding step, domains incl. «اجعله أساسياً», override-count badge, last-20 actions; no new discrepancies.

- [x] **DOC-435** — Document store deactivation and reinstatement
  - **Source**: INT-030 (M20), INT-031 · inventory Domain 16
  - **Audience**: owner
  - **Output**: `docs/guides/console/16-platform-console/deactivation.md`
  - **Must cover**:
    - Deactivation record and custody settled («مسوّاة» = no open shipments, no pending dues, zero merchant Sharwa Pay balance); dues of a suspended store stay reachable; «إعادة التفعيل» keeps history («أُعيد التفعيل»); deactivated stores can't issue waybills.
  - **Screenshots**: deactivation dialog, history
  - **Done when**: documented.
  - **Status**: written in official Step 42 (2026-10-28): the three transitions + «إعادة التفعيل» with their verbatim impact sentences, «مسوّاة»/«غير مسوّاة» definition, suspended-store dues reachable, «أُعيد التفعيل» history kept, waybills blocked; no discrepancies.

- [x] **DOC-436** — Document features catalogue and feature overrides
  - **Source**: INT-030 (M20) · inventory Domain 16
  - **Audience**: owner
  - **Output**: `docs/guides/console/16-platform-console/features-and-overrides.md`
  - **Must cover**:
    - Feature catalogue: kill switch, requires plan, name; resolve a feature for a store (why on/off); overrides list, bulk overrides from the stores screen, delete.
  - **Screenshots**: features catalogue, overrides
  - **Done when**: documented.
  - **Status**: written in official Step 42 (2026-10-28): catalogue with both switches and their confirm/toast sentences (««نقطة البيع»: أُوقفت لكل المنصة.» …), overrides list + «استثناء جماعي» + «إزالة», the stores-screen bulk dialog, cross-links to the per-store tab and «افحص متجراً»; no discrepancies.

- [x] **DOC-437** — Document failed carrier webhook events (DLQ)
  - **Source**: INT-030 (M20) · inventory Domain 16
  - **Audience**: owner
  - **Output**: `docs/guides/console/16-platform-console/webhook-events.md`
  - **Must cover**:
    - List with source filter (incl. sharwa_ship); retry (runs now; failure increments attempts and keeps it pending) or discard.
  - **Screenshots**: DLQ list
  - **Done when**: documented.
  - **Status**: written in official Step 42 (2026-10-28): status/source filters with all six sources, collapsible «الحمولة», synchronous retry with attempts-increment semantics, «تجاهل», deleted-store rule («المتجر لم يعد موجوداً — التجاهل فقط.»); no discrepancies.

- [x] **DOC-438** — Document dues administration
  - **Source**: INT-031 (M45) · inventory Domain 16
  - **Audience**: owner, operator
  - **Output**: `docs/guides/console/16-platform-console/dues.md`
  - **Must cover**:
    - Overview by period (today / 7 / 30 days): revenue, merchant Sharwa Pay balances, pending count; store dues detail: pending commissions (collectable), charges (pending/waived), uninvoiced installations, expired installations, per-currency totals.
    - Actions: collect/waive commission, collect/waive/unwaive charge, generate charge, suspend/reactivate app; collecting debits the merchant's Sharwa Pay wallet; «… تم التعامل معه مسبقاً»; money error sentences.
  - **Screenshots**: dues overview, store dues
  - **Done when**: documented.
  - **Status**: written in official Step 42 (2026-10-28): overview periods and per-currency totals, the five detail sections with every button and its verbatim impact sentence, all seven money/409 error sentences in a messages table, suspended-store rule; no discrepancies.

- [x] **DOC-439** — Document reviewing Sharwa Pay top-ups and withdrawals; wallet lookup
  - **Source**: INT-031 (M45), INT-048 · inventory Domain 16
  - **Audience**: owner, operator
  - **Output**: `docs/guides/console/16-platform-console/sharwa-pay-review.md`
  - **Must cover**:
    - Top-ups: bank name, claimed phone, receipt image; approve credits once; reject needs a note; duplicate bank transaction names the earlier request; unmatched top-ups link to the claimed phone's wallet only if it exists; auto vs reviewed top-ups.
    - Withdrawals: confirm (already debited) or reject (refund credited).
    - Wallet lookup by phone (0777… accepted), last 100 movements.
  - **Screenshots**: top-up detail with receipt, withdrawals list
  - **Done when**: documented.
  - **Status**: written in official Step 42 (2026-10-28): status tabs, receipt rendering incl. «لا صورة إيصال — حوالة بنكية آلية أو بلا مرفق», A/R keys, the single-credit guard, «اذكر سبب الرفض — يصل للعميل.», duplicate-transfer alert with «عرض الطلب السابق #N», the unmatched-transfer rule, debit-at-request note and the >14-day hint, wallet lookup with `0770000111` → `967…`; no discrepancies.

- [x] **DOC-440** — Document Sharwa Ship zones administration
  - **Source**: INT-031 (M45) · inventory Domain 16
  - **Audience**: owner only
  - **Output**: `docs/guides/console/16-platform-console/sharwa-ship-zones.md`
  - **Must cover**:
    - Zone code fixed once created (e.g. «SAN-01»); geo bounds optional but all-or-none (7 decimals); zones without bounds show «بلا حدود» and aren't drawn.
  - **Screenshots**: zones map/table
  - **Done when**: documented.
  - **Status**: written in official Step 42 (2026-10-28): owner-only note, full field table with the trio rule and «مثل SAN-01.»/«الكود مستخدم لمنطقة أخرى.», 7-decimal storage, «بلا حدود» rows skipped by the map, waybill snapshot on delete, legacy `sanaa_inner_city` note; no discrepancies.

- [x] **DOC-441** — Document plans and the plan-feature matrix
  - **Source**: INT-032 (M46) · inventory Domain 16
  - **Audience**: owner (writes), operator reads
  - **Output**: `docs/guides/console/16-platform-console/plans.md`
  - **Must cover**:
    - Plan price, commission display («—» / «2.50%» / amount), current subscribers; code fixed; one default plan which must be free and active; delete refused with current subscribers, or «عطّلها بدل الحذف» with historical ones; feature matrix cells.
  - **Screenshots**: plans, matrix
  - **Done when**: documented.
  - **Status**: written in official Step 42 (2026-10-28): table incl. the three commission forms and «اشتراكات حالية» link, full editor field table with verbatim error sentences, single default rule («تُسند للمتاجر الجديدة عند تفعيل الباقات. واحدة فقط.»), both delete refusals with «نقل إلى باقة أخرى», matrix with instant-save cells; no discrepancies.

- [x] **DOC-442** — Document subscriptions and billing settings
  - **Source**: INT-032 (M46) · inventory Domain 16
  - **Audience**: owner
  - **Output**: `docs/guides/console/16-platform-console/subscriptions-and-billing.md`
  - **Must cover**:
    - Subscriptions filters, assign a plan (previous one cancelled), period end, notes ≤ 255.
    - Billing settings: stores without subscription; turning plans on assigns the default free plan to every such store («إسناد تلقائي عند تفعيل الباقات»), refused when no active default free plan exists; commission settings.
  - **Screenshots**: subscriptions, billing settings
  - **Done when**: documented.
  - **Status**: written in official Step 42 (2026-10-28): filters incl. «الحالية فقط», assign dialog with end-of-day period and 255 notes, previous-cancelled semantics, both switches with their verbatim impacts, «إسناد تلقائي عند تفعيل الباقات», «لا باقة مجانية افتراضية نشطة — أنشئها أولاً.», the five resolution steps and «افحص متجراً»; no discrepancies.

- [x] **DOC-443** — Document apps catalogue, app billing overrides and market categories
  - **Source**: INT-032 (M46), INT-040 · inventory Domain 16
  - **Audience**: owner
  - **Output**: `docs/guides/console/16-platform-console/apps-and-market-categories.md`
  - **Must cover**:
    - Apps: code fixed, icon chosen from the UI library, installations count; delisting effects on stores.
    - App billing overrides (one per app × store).
    - Market categories: reorder, stores count, used category «عطّلها بدل الحذف».
  - **Screenshots**: apps catalogue, overrides, categories
  - **Done when**: documented.
  - **Status**: written in official Step 42 (2026-10-28): catalogue with «مجاني» display and the free+billing conflict note, fixed code, icon hint sentence, delisting effects, override form/uniqueness/delete, categories with inline rename, full-list reorder, «متاجر اختارتها», «الفئة مختارة لدى N متجراً — عطّلها بدل الحذف.»; no discrepancies.

---

## Track 3 — Architecture & DevOps Guide

> Multi-tenancy, BFF/live-mock architecture, security, data & money integrity, data model, Celery jobs, migrations, environment, deployment, testing, open items register. Output: `docs/architecture/` + `docs/ops/`.

### 3.1 System overview

The big picture: what runs where, how the two repositories cooperate, and how Phase 002 integrated 49 modules into one system.

- [x] **DOC-444** — Write the system architecture overview (components and request paths)
  - **Source**: inventory header + A.1 + A.2 · all INT-001 → INT-049
  - **Output**: `docs/architecture/00-system-overview.md`
  - **Must document**:
    - Components: Next.js frontend (`sharwa-frontend`, App Router, `(admin)` console layout, dashboard, storefront, PWA), the Next BFF under `/api/bff/` (`src/lib/bff/*`), Django + DRF backend (`sharwa_saas`, JSON API under `/api/v1/`, `api/urls.py`, `api/views_*.py`, `api/serializers_*.py`, `products/services/*`, `tenants/*`, `billing`, `appstore`, `sharwapay`), django-tenants on PostgreSQL (public schema + one schema per store), Celery workers + Celery Beat, cache (throttles, OTP HMACs, cooldowns, markers), media storage.
    - The four request paths: (1) browser → BFF `liveOrMock` → Django; (2) browser → BFF Django-first adapters (`storefrontAdapter`, `tryTarget`/`tryStoreTarget`, legacy adapter) → Django with fixture fallback; (3) Next server fetchers (`getPublicJson`, `getProduct()`, `getTracking()`, `probeStore()`, landing-page fetchers) → Django; (4) the `/api/v1/*` transparent passthrough for «Ready» rows (`ready-api-v1.md`).
    - Repo-relative path conventions (`sharwa_saas` = Django, `sharwa-frontend` = Next.js); Django routes under `/api/v1/`, BFF routes under `/api/bff/`; Arabic strings in «…» are verbatim server/UI sentences.
    - The legacy Django HTML screens kept alongside every new API (same services called by both surfaces — no second engine).
    - A component diagram (Mermaid) and one sequence diagram per request path.
  - **Done when**: a new engineer can trace any screen's call from browser to Django model using only this page.
  - **Status**: written in official Step 06 (2026-10-27): `docs/architecture/00-system-overview.md` (13 components with a Mermaid component diagram, host/origin map, the four request paths with one sequence diagram each, path conventions, a 7-step trace recipe worked on ⌘K search browser → BFF → view → service → model, legacy HTML screens: one engine, two surfaces).

- [x] **DOC-445** — Write the domain map (16 domains × 49 modules × live keys)
  - **Source**: inventory Table of contents + Part C traceability matrix + Domain 1–16 overview tables
  - **Output**: `docs/architecture/01-domain-map.md`
  - **Must document**:
    - The 16 domains with their Arabic names and the INT ids/modules each contains: D1 (INT-001 M01, INT-002 M47, INT-004 M02); D2 (INT-003 M03, INT-008 M48, INT-009 M49, INT-049 M43); D3 (INT-005 M04, INT-006 M05, INT-045 M37); D4 (INT-007 M06, INT-026 M24); D5 (INT-011 M09, INT-012 M10, INT-013 M11, INT-014 M12, INT-015 M41, INT-016 M44, INT-029 M42); D6 (INT-017 M07, INT-028 M35); D7 (INT-018 M08, INT-019 M13, INT-034 M17); D8 (INT-020 M14, INT-043 M33, INT-048 M40); D9 (INT-044 M36); D10 (INT-024 M21, INT-025 M22, INT-035 M23); D11 (INT-021 M15, INT-046 M38, INT-047 M39); D12 (INT-010 M34, INT-022 M18, INT-023 M19); D13 (INT-037 M27, INT-038 M28, INT-039 M29, INT-033 M16, INT-036 M26); D14 (INT-040 M30, INT-041 M31, INT-042 M32); D15 (INT-027 M25); D16 (INT-030 M20, INT-031 M45, INT-032 M46).
    - Per module: Django provider files (services + views), live key or "Django-first, no switch", integration date (2026-10-24 → 2026-10-26).
    - Each domain's "Domain relationship" paragraph rewritten as dependency arrows between domains (e.g. returns → wallet ledger; POS/channels/marketplaces/dropship/bookings → M06 orders; Sharwa Ship → Sharwa Pay wallet; console → plans/features of every store).
    - Totals line: 49 tasks · 49 modules · 16 domains · 39 live keys · 28 migrations · 49 task test suites.
  - **Done when**: every INT id appears once with its domain, module, provider and live key.
  - **Status**: written in official Step 06 (2026-10-27): `docs/architecture/01-domain-map.md` (16 domains with Arabic names; INT-001 → 049 each once with module, provider files, live key and date; checked totals line; 39-key breakdown; Mermaid dependency graph with an explanation per arrow).

- [x] **DOC-446** — Document the integration protocol (mock-adapter pipeline) as the standard for future modules
  - **Source**: inventory A.1 · project instructions (FULL-STACK INTEGRATION PROTOCOL)
  - **Output**: `docs/architecture/02-integration-protocol.md`
  - **Must document**:
    - Step 1 Diagnose: the frontend Data Contract (Zod schemas in `src/features/<module>/schemas.ts` + fixture in `src/mocks/<module>`) is the immutable source of truth; "frontend is the source of truth for the Django API contract".
    - Step 2 BFF adapter: `liveOrMock(request, "<module>", "/api/v1/…", mock)` with the module toggled in `SHARWA_LIVE_MODULES`, or a Django-first adapter for rows already served by Django.
    - Step 3 Django provider order: services → DRF views (+ serializers where used) → `api/urls.py` → migrations → tests; field names mapped server-side so JSON matches the contract exactly.
    - Step 4 Wiring & QA gates: `npm run lint`, `npx tsc --noEmit`, module mock E2E script `scripts/<module>-check.ts`, Django test suites, live run with the module switched on; a task is ticked only after Step 4 passes.
    - The recurring "Before / Django provider / Routes & payloads / Gates / Rules / Mapping / Gaps closed / Bugs fixed / Frontend / Tests / Out of scope" entry structure as the template for future integration write-ups.
    - The "Django is the authority" rule for business rules where mock and legacy differed (mock is then aligned to Django), and "mock aligned" as a required step.
    - The `[NEEDS BACKEND]` marker convention in frontend code/docs and how it was cleared.
  - **Done when**: the protocol page can be followed for a new module without reading Phase 002 specs.
  - **Status**: written in official Step 06 (2026-10-27): `docs/architecture/02-integration-protocol.md` (four-step pipeline with a Mermaid flow, adapter-choice table, Django build order, Step 4 QA gates with commands, «Django is the authority» and «mock aligned», copy-ready write-up template, the `[NEEDS BACKEND]` convention and what remains, new-module checklist).

- [x] **DOC-447** — Write the project phase history and checkpoints
  - **Source**: inventory A.1 + Part C "Phase checkpoints"
  - **Output**: `docs/architecture/03-phase-history.md`
  - **Must document**:
    - Out of scope of Phase 002 (no module ids): Phase 1 (Setup), Phase 2 (Foundational: BFF core, `upstream.ts`, `api-client`, mock runtime — already in place), Phase 8 (Polish).
    - Live status when the roadmap was created (2026-10-24): `SHARWA_LIVE_MODULES=reports,catalog,products`; M05 live-tested and committed; M04 Steps 1–3 committed; merchant auth endpoints (M03) built.
    - Integration timeline 2026-10-24 (INT-001…INT-021), 2026-10-25 (INT-022…INT-037), 2026-10-26 (INT-038…INT-049).
    - Checkpoints: US1 — `/` → store → product → completed order on Django without mocks; US2 — full buying session on Django; US3 — every P2 module on Django alone; US4 — re-provision a store, enable a feature, approve a wallet top-up, collect a due on Django; US5 — every P3 module on Django without state conflicts with M06/M21. Phase 6 (US4 — platform owner) complete on Django.
  - **Done when**: the page states which checkpoints hold and how to re-verify each.
  - **Status**: written in official Step 06 (2026-10-27): `docs/architecture/03-phase-history.md` (phases 001/002/003, out-of-scope phases, state on 2026-10-24, timeline table and Gantt, Foundation/US1–US5/Phase 6 checkpoints with evidence and re-verification commands — marked not re-run in this step).

### 3.2 Multi-tenant architecture

How stores are isolated, resolved, provisioned, customised with domains and administered from the public schema.

- [x] **DOC-448** — Document the public vs tenant schema split (model placement register)
  - **Source**: A.4, Domains 1, 2, 6, 8, 11, 12, 14, 16 · INT-017, INT-023, INT-030, INT-031, INT-032, INT-037, INT-041, INT-048, INT-049
  - **Output**: `docs/architecture/10-multi-tenancy.md#schemas`
  - **Must document**:
    - Public schema holds: `tenants.Client` / `tenants.Domain`, `tenants.CustomDomain` (claims, migration `tenants/0026_customdomain`), `TenantStatsSnapshot` (daily orders/completed/refunded/revenue_sar), `MerchantAccount` + `MerchantAccountClient`, `TenantDeactivationRecord`, `PendingWebhookEvent`, `PlatformActionLog`, `CentralCustomerTrust`, `SharwaShipZone`, billing (`Plan`, `Feature`, plan features, `Subscription`, `TenantFeatureOverride`, `PlatformBillingSettings`), appstore (`App`, `AppBillingOverride`, market categories), the `sharwapay` app (`SharwaPayWallet` with four currency balances, top-up/withdrawal requests, audit rows), bridge/session indexes (`ChannelSessionIndex`, `WhatsAppSessionIndex`), public webhooks receivers (`tenants/webhooks_ai.py`, `tenants/webhooks.py`), device tracker for COD OTP.
    - Tenant (store) schema holds everything else: catalog, orders, `AuditLog`, inventory, locations, customers ledgers, merchant wallet, expenses, staff/RBAC, settings `StoreSetting`, channels, marketplaces, dropshipping, POS, bookings, app installations, support, notifications.
    - Rules: never merge platform trust (`CentralCustomerTrust`) with store trust (`CustomerReliabilityRecord`); Sharwa Pay is public and cross-store (platform origin only); the console runs only on public.
    - Bug class to warn about: reading `connection.schema_name` inside `schema_context('public')` (INT-021 `resolve_carrier_credentials` / `carrier_settings_save_view` fix).
  - **Done when**: every model named in the inventory is placed in public or tenant in a single table.
  - **Status**: written in official Step 06 (2026-10-27): `docs/architecture/10-multi-tenancy.md#schemas` (SHARED_APPS/TENANT_APPS split, single model-placement table, the five placement rules, the `schema_context('public')` bug class with the INT-021 fix and two remaining writers flagged).

- [x] **DOC-449** — Document tenant resolution and the store guard middleware
  - **Source**: INT-002 (M47) · Domain 1 · A.4
  - **Output**: `docs/architecture/10-multi-tenancy.md#resolution`
  - **Must document**:
    - `TenantHeaderOverrideMiddleware` (resolves the store from host / `X-Store-Domain`; refuses switching a bound session to another store) and `TenantProvisioningGuardMiddleware` (404/403/503 for unknown / inactive / not-ready stores).
    - `probeStore()` in Next hitting Django `/api/v1/config/` directly; the BFF status route reading `/register/status/<token>/` (setup_token, forwarded host); `HEAD` served by the passthrough.
    - Contract locked by `api/test_tenant_guard_api.py`.
    - `/config/` as the storefront bootstrap and the extensions handed over to INT-010 (currency, SEO, contact, policies, timezone, week start, announcement styling/banner flags, free-shipping threshold), INT-019 (gifting, loyalty), INT-023 (tracking) — all served by `StoreConfigSerializer`.
    - Public-schema-only endpoints answer 404 on a store host or with `X-Store-Domain` (console, Sharwa Pay).
  - **Done when**: the 404/403/503 matrix for the probe is documented with its causes.
  - **Status**: written in official Step 06 (2026-10-27): `docs/architecture/10-multi-tenancy.md#resolution` (middleware chain in settings order, header-override steps, provisioning guard, 200/404/403/503 probe matrix with causes and verbatim bodies, test contract, Mermaid sequence, BFF status route and HEAD poll, `/config/` extensions, public-only 404s).

- [x] **DOC-450** — Document store provisioning, the sweeper and re-provisioning
  - **Source**: INT-004 (M02), INT-002, INT-030 (M20) · A.8
  - **Output**: `docs/architecture/11-provisioning.md`
  - **Must document**:
    - Registration flow: `api/views_onboarding.py` (market-categories, register, verify-otp, resend-otp) + legacy `/register/check-subdomain/` and `/register/status/<token>/`; pending registration lifetime 30 min (410 after); statuses 400 `{field}`/`{code}`, 410, 429 + `Retry-After`, 502.
    - Subdomain rules: 3–50 characters (Django shared validator + frontend `SUBDOMAIN_MAX`), reserved-name validator (also used by console domain edits).
    - Celery `queue_provisioning` / `provision_tenant_schema`; provisioning statuses (`pending`, `provisioning`, `ready`, `failed`, derived `stalled`); sweeper thresholds pending > 5 min / provisioning > 20 min.
    - Signed short-lived setup token on the dashboard link after provisioning (first password `setup-password`), so a new store cannot be claimed by whoever reaches it first.
    - Re-provision from the console `stores/reprovision/` (failed or stalled only = admin action verbatim: set `pending` + `queue_provisioning`, per-store reasons); stores/detail screens poll on `pending`.
    - Registration assigns the default free plan (INT-032 rule: it must be free AND active).
    - `provisioning_notice` notification for an empty ready store (INT-009).
  - **Done when**: the state diagram of provisioning statuses and every transition trigger is drawn.
  - **Status**: written in official Step 06 (2026-10-27): `docs/architecture/11-provisioning.md` (registration → pending store, subdomain 3–50 and reserved names, `queue_provisioning` / `provision_tenant_schema` with lock, state diagram with every trigger, derived `stalled`, sweeper 5/20 min on Beat, Celery settings, setup token, console and admin re-provision, default free-and-active plan, `provisioning_notice`).

- [x] **DOC-451** — Document the custom domain architecture (claim → DNS → routing → TLS)
  - **Source**: INT-023 (M19) · A.10
  - **Output**: `docs/architecture/12-custom-domains.md`
  - **Must document**:
    - Public `tenants.CustomDomain` claim kept apart from `tenants.Domain` so nobody can squat a hostname before proving it; max 5 per store; duplicate/another store's domain refused; format check = frontend `domainFormatError` text.
    - Subdomain row `id 0` (read-only, primary when no custom domain is).
    - DNS records: CNAME (subdomain host) or A (apex) to `SHARWA_EDGE_CNAME` / `SHARWA_EDGE_IP` + TXT `_sharwa.<host>`.
    - `verify/` with dnspython (503 if dnspython unavailable) → `failed` with reason, or creates the `tenants.Domain` row → `verifying` → `active` once HTTPS answers.
    - TLS issuance is an ops step documented in `deploy/README` (link the runbook).
    - `set-primary/` only for `active` (0 = back to subdomain), mirrors `StoreSetting.custom_domain` for legacy consumers; DELETE refuses the subdomain and the primary.
    - Console-side domain management `stores/<schema>/domains/` + `domains/<id>/` (reserved-name validator, primary switch) — INT-030.
    - `store_url` in settings from the tenant's primary domain (INT-010); rollup `domain` = primary domain else any, else `#` (INT-049).
  - **Done when**: the state machine `pending → failed | verifying → active` and the edge config are documented end to end.
  - **Status**: written in official Step 06 (2026-10-27): `docs/architecture/12-custom-domains.md` (`CustomDomain` claim vs `Domain` routing, subdomain row id 0, max 5 and refusal rules, CNAME/A + TXT with `SHARWA_EDGE_*`, verify with dnspython and 503, state machine `pending_dns → failed | verifying → active` with triggers, TLS ops step, set-primary mirror, delete refusals, console routes, `store_url` and rollup `domain`).

- [x] **DOC-452** — Document cross-schema access patterns from the public console
  - **Source**: INT-030, INT-031, INT-032, INT-049 · A.11
  - **Output**: `docs/architecture/13-cross-schema-access.md`
  - **Must document**:
    - Every tenant-schema read from the console wrapped in a savepoint (a missing schema never poisons the request).
    - Cross-store counts as one `UNION ALL` over every ready store schema with per-schema savepoint fallback (dues `pending_count` INT-031, app `installations` INT-032).
    - Store detail reads (domains, subscriptions, installations from the store schema, override count, last 20 actions); Sharwa Ship truth = `DeliveryMethod.is_sharwa_official` in the store schema with a 10-min cache marker «قيد التفعيل/الإلغاء».
    - Multi-store rollup: fixed query count (one grouped sum + one grouped max over public `TenantStatsSnapshot`), no live cross-schema query (INT-049).
    - Bug pattern fixed: `generate_billing_charge` caught `IntegrityError` without a savepoint → TransactionManagementError; now wrapped in `atomic()` (INT-031).
  - **Done when**: the page gives code-level rules for any future console read into store schemas.
  - **Status**: written in official Step 06 (2026-10-27): `docs/architecture/13-cross-schema-access.md` (guarded store reads, `UNION ALL` counts with per-schema fallback, store detail reads, Sharwa Ship truth and 10-minute marker, rollup fixed query count, the `generate_billing_charge` `atomic()` fix, 8 code-level rules and a copy-ready pattern).

- [x] **DOC-453** — Document store deactivation and reinstatement
  - **Source**: INT-030 (M20), INT-031
  - **Output**: `docs/architecture/14-store-lifecycle.md`
  - **Must document**:
    - `stores/<schema>/deactivation/` GET/POST; `TenantDeactivationRecord.reinstated_at` / `actor` / `updated_at` (migration `tenants/0027_platform_console_api`) — «إعادة التفعيل» closes the record instead of deleting it.
    - Guards that filter `reinstated_at__isnull`: waybill issue + edge-cases banner.
    - Custody «مسوّاة» = no open shipments, no pending platform dues, zero merchant Sharwa Pay balance.
    - Dues of a suspended store stay reachable (legacy page required `is_active`, which would have dead-locked «close only after dues are settled»).
    - `is_available` in the rollup = `is_active` AND `provisioning_status=ready`.
  - **Done when**: lifecycle states active / deactivated / reinstated and their side effects are diagrammed.
  - **Status**: written in official Step 06 (2026-10-27): `docs/architecture/14-store-lifecycle.md` (`TenantDeactivationRecord` and migrations 0022/0027, suspend / deactivate / close / reinstate rules with Arabic refusals, reinstatement closes the record, custody «مسوّاة», waybill and edge-case guards, reachable dues, rollup `is_available`, Mermaid state diagram with side effects).

- [x] **DOC-454** — Document plan features and the feature decision engine
  - **Source**: A.5 · INT-030, INT-032, INT-033
  - **Output**: `docs/architecture/15-plans-and-features.md`
  - **Must document**:
    - Single decision source `billing.models.resolve_feature_decision` → `(enabled, decided_by)`; `_resolve_feature_enabled` takes `[0]`; console `features/<code>/resolve/` and per-store `source` = deciding step.
    - Feature catalog properties: kill switch, `requires_plan`, name; per-store `TenantFeatureOverride` (+ `updated_at`, migration `billing/0012…`); bulk overrides.
    - Legacy codes `require_feature` / `settings_feature_enabled` and the full list of features checked by the API: `contact_info`, `store_policies`, `shipping_settings`, `currency_settings`, `seo_settings`, `coupon`, `multi_location`, `storefront_design`, `abandoned_carts`, `campaigns`, `timeline`, `loyalty_settings`, `gift_settings`, `payment_gateways`, `local_wallets`, `bank_transfers`, `merchantwallet`, `shipping_companies`, `pickuplocation`, `shipping_providers`, `staff_rbac`, `tracking_tools`, `inventory`, `refunds`, `customer_wallets`, `pos` (new, `requires_plan=True`, open while subscriptions are off, migration `billing/0013_seed_pos_feature`), `social_channels`, `marketplaces`, `dropshipping`, `app_marketplace`, `bookings`, `sharwa_ship`.
    - Areas with no plan feature by design: dues and `store/payments` (INT-020), procurement (INT-035), support (INT-042), expenses (INT-043).
    - Turning plans ON assigns the active default free plan to every ready store without one in the same transaction (note «إسناد تلقائي عند تفعيل الباقات»), 400 when none exists; no plan ⇒ step 5 «غير متاحة» for `requires_plan` features.
    - `Subscription.assign_plan` is the only assignment point; previous current subscription marked `cancelled` with date; `Plan.save()` keeps a single default; `Subscription.plan` PROTECT.
  - **Done when**: the decision order (kill switch → override → plan → default) is written as a flowchart with `decided_by` values.
  - **Status**: written in official Step 06 (2026-10-27): `docs/architecture/15-plans-and-features.md` (`resolve_feature_decision` flowchart with all 6 `decided_by` values, engine callers, catalogue/override/plan models, migrations 0012/0013, kill switch and overrides, subscription rules, plans-ON auto-assign «إسناد تلقائي عند تفعيل الباقات», the 35 codes checked by the API out of 40 seeded, areas without a plan feature).

### 3.3 BFF & live/mock switch architecture

The Next.js Backend-for-Frontend, how each module is switched between fixtures and Django, and how to operate the switch.

- [x] **DOC-455** — Document the `liveOrMock` switch and `forwardLive` passthrough
  - **Source**: A.2 · A.11
  - **Output**: `docs/architecture/20-bff.md#liveormock`
  - **Must document**:
    - `src/lib/bff/live-route.ts` (`liveOrMock`, `forwardLive`): mock mode → fixture handler unchanged with header `x-sharwa-mock: 1`; live mode when `SHARWA_MOCKS=off` or module named in `SHARWA_LIVE_MODULES` (`*` = all) → transparent passthrough to `upstreamPath`: query string, cookies, CSRF header, status and body forwarded verbatim.
    - No Next-side session gate in live mode: Django answers 401/403 itself.
    - Write bodies buffered with Content-Length, 8 MB max = `DATA_UPLOAD_MAX_MEMORY_SIZE`; multipart forwarded as-is (design, offers, feeds, top-ups, imports).
    - A successful live write on a store host drops that store's cached storefront reads via `revalidateTag(storeTag(store))`, same as `mockRoute` in mock mode.
    - Forwarded response headers include `x-export-rows` (INT-017), `Retry-After`, `Cache-Control`.
  - **Done when**: a sequence diagram covers mock vs live for a GET and a multipart POST.
  - **Status**: written in official Step 07 (2026-10-27): `docs/architecture/20-bff.md#liveormock` (`liveOrMock`/`forwardLive` design, no Next-side gate in live mode, buffered bodies and size layers, multipart-as-is list, `revalidateTag(storeTag(store))`, forwarded response headers; Mermaid mock vs live for a GET and a multipart POST).

- [x] **DOC-456** — Document the products rule tables and the three independent product switches
  - **Source**: A.2 · INT-005, INT-044, INT-045 · Domain 3
  - **Output**: `docs/architecture/20-bff.md#products-rules`
  - **Must document**:
    - `src/lib/bff/live-products.ts`: `PRODUCTS_LIVE_RULES`, `B2B_LIVE_RULES`, `ADVANCED_LIVE_RULES`, called first by `mockRoute` through `dispatchLiveProducts`, before any mock gate.
    - Switches `products` (every Phase A row one-to-one), `b2b` (`products/<id>/extras/tier-prices[/<tier_id>]` → `/api/v1/products/<id>/tier-prices/…`), `advanced_products` (M37 extras, import ×3, `export.csv` → `/api/v1/products/export/`) — independent of each other.
    - «تطبيق على منتجات» stays BFF-orchestrated (decision D7).
    - Storefront auction rows Django-first (no switch).
  - **Done when**: a table lists every BFF products row and which switch routes it.
  - **Status**: written in official Step 07 (2026-10-27): `docs/architecture/20-bff.md#products-rules` (dispatch flowchart, the three independent switches, a 37-row table of every BFF products row with route file, Django path and switch, D7 `applyTemplateLive`, storefront auction rows Django-first).

- [x] **DOC-457** — Document the platform catch-all grouping and the Django-first adapters
  - **Source**: A.2 · INT-001, INT-002, INT-003, INT-004, INT-011 → INT-016, INT-028, INT-029, INT-030 → INT-032, INT-034, INT-036, INT-045
  - **Output**: `docs/architecture/20-bff.md#adapters`
  - **Must document**:
    - `app/api/bff/platform/[...path]`: one catch-all, live per row group `platform` (M20), `platform_money` (`dues`, `sharwa-pay`, `sharwa-ship`), `platform_billing` (M46 rows).
    - Django-first server fetchers (`getPublicJson`, `getProduct()`, `getTracking()`, `probeStore()`, landing-page fetchers): Django wins; fixture only on 404/405/501 or Django down; no switch.
    - `storefrontAdapter` rows: INT-011 → INT-015, INT-028 (5 storefront rows), INT-029, INT-034 (referral), INT-036 (buyer rows), INT-045 (storefront auction + bids).
    - `tryTarget` / `tryStoreTarget` / legacy adapter: INT-003 counters/overview/refresh, INT-004 onboarding.
    - `/api/v1/*` transparent passthrough for «Ready» rows (`ready-api-v1.md`): cart `/api/v1/cart*` (INT-013), PWA rows #11–#14 (INT-016), returns «Ready» rows (INT-026), B2B draft rows (INT-044), five courier actions (INT-046); fixture fallback on 404/unreachable.
    - Fixture-only hooks never switched: POS `__reset`, `inbox/_mock/*`, B2B `_test/bump`.
    - Platform-origin gate for `/api/bff/sharwa-pay/*` (404 elsewhere).
  - **Done when**: each adapter pattern has its fallback rule and the list of modules using it.
  - **Status**: written in official Step 07 (2026-10-27): `docs/architecture/20-bff.md#adapters` (11 adapter patterns with Django-wins and fallback rules and the modules using each, platform catch-all groups, server fetchers, `storefrontAdapter`, `/api/v1/*` passthrough, fixture-only hooks, Sharwa Pay platform-origin gate, decision flow for new rows).

- [x] **DOC-458** — Document the mock runtime
  - **Source**: A.2 (mock runtime paragraph)
  - **Output**: `docs/architecture/21-mock-runtime.md`
  - **Must document**:
    - `src/mocks/runtime.ts`: `isMocksOn()` (`SHARWA_MOCKS=on|off`, default on outside production), `isModuleLive(module)`, `notAvailable()` (501 «غير متاح بعد.» when mocks are off and no endpoint exists), `x-sharwa-mock: 1` on every mocked response.
    - Mock E2E scripts must run with `SHARWA_LIVE_MODULES=none`; Windows cmd syntax `set SHARWA_LIVE_MODULES=none&& npm run dev` (`set X=` deletes the variable).
    - `requireMocks()` preflight in `scripts/b2b-check.ts` checking the `x-sharwa-mock` header (pattern to copy into other scripts).
    - Fixtures in `src/mocks/<module>`, aligned to Django rules after each integration ("mock aligned" notes).
  - **Done when**: a developer can run any screen fully on fixtures and know which header proves it.
  - **Status**: written in official Step 07 (2026-10-27): `docs/architecture/21-mock-runtime.md` (runtime functions and switches, `x-sharwa-mock` 1/0/absent table, run-any-screen-on-fixtures recipe, cmd/PowerShell/bash syntax and pitfalls, copy-ready `requireMocks()`, guarded vs unguarded check scripts, fixture folders, known non-aligned fixtures).

- [x] **DOC-459** — Publish the live-module key register (all 39 keys)
  - **Source**: A.3 · Part C
  - **Output**: `docs/architecture/22-live-module-keys.md`
  - **Must document**:
    - One row per key with task, module and BFF rows switched: `reports` (INT-027, 9 rows → `api/views_reports.py`, first live module), `catalog` (INT-006, 15 rows), `products` (INT-005, `PRODUCTS_LIVE_RULES`), `orders` (INT-007, 11 rows, print reuses detail), `search` (INT-008), `notifications` (INT-009, 4 rows), `settings` (INT-010, `settings` + 9 section rows via `settingsWrite(upstream, …)`), `pwa` (INT-016, `push/stats` + `push/test`), `customers` (INT-017, 13 rows), `design` (INT-018, 6 rows multipart as-is), `marketing` (INT-019, 18 rows), `payments` (INT-020, 11 rows), `shipping` (INT-021, 25 rows incl. Sharwa Ship zones list), `staff` (INT-022, 25 rows + reset-password), `integrations` (INT-023, 13 rows), `inventory` (INT-024, 8 handlers), `locations` (INT-025, 14 handlers), `returns` (INT-026, 4 rows), `wallets` (INT-028, 7 merchant rows), `platform` (INT-030), `platform_money` (INT-031), `platform_billing` (INT-032), `pos` (INT-033, `api/bff/pos/[...path]`), `affiliates` (INT-034, both catch-alls `/api/v1/<kind>/<path>/`), `procurement` (INT-035, `/api/v1/<resource>/<path>/`), `bookings` (INT-036 merchant rows), `channels` (INT-037, `inbox/[...path]` + `channels/[[...path]]`), `marketplaces` (INT-038), `dropshipping` (INT-039), `apps` (INT-040, except `sharwa-ai/*`), `sharwa_ai` (INT-041), `support` (INT-042), `expenses` (INT-043), `b2b` (INT-044), `advanced_products` (INT-045), `courier` (INT-046, 4 reads), `sharwa_ship` (INT-047, 7 `/api/bff/shipping/{sharwa-ship,shipments,awb-queue,rate-cards,supervisor,agents,agent-shifts}` routes), `sharwa_pay` (INT-048, platform origin only), `rollup` (INT-049).
    - The "no switch (Django-first by construction)" list: INT-001, INT-002, INT-003 counters/overview/refresh + auth, INT-004, INT-011 → INT-015, INT-016 passthrough rows, INT-028/029/034/036/045 storefront rows, INT-044 draft rows, INT-046 courier actions.
    - Production value: `SHARWA_MOCKS=off` (all live) vs staged rollout values.
  - **Done when**: the register matches `src/lib/bff` source and `.env.example` line by line.
  - **Status**: written in official Step 07 (2026-10-27): `docs/architecture/22-live-module-keys.md` (all 39 keys with task, module, row count, BFF location, Django upstream and provider; key set re-verified from code; no-switch list; values per environment; 39-row parity table against `.env.example`).

- [x] **DOC-460** — Write the runbook "switch a module live / roll it back"
  - **Source**: A.2, A.3, A.1 Step 4
  - **Output**: `docs/ops/runbooks/switch-module-live.md`
  - **Must document**:
    - Preconditions: Django migrations applied for that module (A.9), Celery jobs it needs running (A.8), plan feature enabled for the test store (A.5), permission keys seeded.
    - Steps: add the key to `SHARWA_LIVE_MODULES` (or `*` / `SHARWA_MOCKS=off`), restart Next, verify absence of `x-sharwa-mock` header, run the module's Django suite and live smoke test, check 401/403 come from Django.
    - Rollback: remove the key, restart; note that Django-first rows cannot be rolled back by the switch (they fall back only on 404/405/501/Django down).
    - Windows vs Linux env syntax.
  - **Done when**: an operator can roll a single module forward and back in under five minutes.
  - **Status**: written in official Step 07 (2026-10-27): `docs/ops/runbooks/switch-module-live.md` (decision diagram, 39-key preconditions table, timed forward/back checklist under five minutes, env syntax per shell, `x-sharwa-mock` check, how to tell a Django 401/403, rollback limits, troubleshooting).

- [x] **DOC-461** — Fix and document the `.env.example` `SHARWA_LIVE_MODULES` sample line
  - **Source**: A.13 known inconsistencies · INT-024, INT-025, INT-026, INT-028
  - **Output**: `sharwa-frontend/.env.example` + `docs/ops/environment.md#live-modules`
  - **Must document**:
    - The sample line omits `inventory`, `locations`, `returns`, `wallets` although those keys are switched by INT-024/025/026/028 — A.3 is authoritative; add them and list all 39 keys.
    - Keys added during integration by tasks (`rollup`, `payments`, `shipping`, `staff`, `affiliates`, `procurement`, `bookings`, `channels`, `marketplaces`, `dropshipping`, `apps`, `sharwa_ai`, `support`, `expenses`, `b2b`, `advanced_products`, `courier`, `sharwa_ship`, `sharwa_pay`, `pos`…).
  - **Done when**: `.env.example` lists every key in A.3 and a check script/grep confirms parity.
  - **Status**: documentation written in official Step 07 (2026-10-27): `docs/ops/environment.md#live-modules` (full 39-key line, the 4 omitted keys, parity-check script for bash and PowerShell). **Left open**: `.env.example` is not edited — the execution plan allows code/config edits only in Step 52; the parity check currently fails (35 / 39). **Closed in official Step 52 (2026-10-30)**: `.env.example` sample line now lists all 39 keys (adds `inventory`, `locations`, `returns`, `wallets`) and the comment block describes `integrations`, `inventory`, `locations`, `returns`, `wallets`; parity confirmed by `docs/_tools/check_terms.py` rule T1 against glossary §4 (the node parity script of `environment.md` §1.4 should now print 39 / 39 on fares's machine).

- [x] **DOC-462** — Remove or document the superseded `account/stores` BFF route
  - **Source**: A.13 · INT-003, INT-049
  - **Output**: `docs/architecture/20-bff.md#deprecated` (+ code removal PR note)
  - **Must document**:
    - `account/stores` superseded by M43 `/merchant/stores/` (topbar switcher + ⌘K use `useLinkedStores`); the old BFF route has no consumer — remove or mark deprecated.
  - **Done when**: the route is deleted or flagged deprecated and the doc says which.
  - **Status**: written in official Step 07 (2026-10-27): `docs/architecture/20-bff.md#deprecated` (`account/stores` FLAGGED DEPRECATED, not deleted — deletion is a Step 52 code fix; comparison with `merchant/stores`; consumer check; exact removal set).

- [x] **DOC-463** — Re-audit `ready-api-v1.md` («Ready» passthrough list)
  - **Source**: A.13 · INT-016, INT-026, INT-044, INT-046
  - **Output**: `docs/architecture/23-ready-api-v1-audit.md` (+ updated `ready-api-v1.md`)
  - **Must document**:
    - Rows #11/#13 updated in INT-016 (`push/subscribe/` now takes `order_uuid`); rows changed shape in INT-026 (returns rewritten behind same URLs), INT-044 (B2B drafts list adds `created_by_name`, `escalated_at`), INT-046 (start/handover/partial-delivery contract fixes); cart rows #5–#7 (INT-013), PWA rows #11–#14.
    - For each Ready row: current Django shape vs Zod schema, status, owning INT.
  - **Done when**: every Ready row has a verified/updated status and date.
  - **Status**: written in official Step 07 (2026-10-27): `docs/architecture/23-ready-api-v1-audit.md` (all 30 Ready rows checked against Django and the consumer Zod schema with status, owning INT and date: 8 verified, 21 changed, 1 changed ⚠; §6 is a paste-ready replacement table — `ready-api-v1.md` itself is not edited, reserved for Step 52 / fares's decision).

- [x] **DOC-464** — Document the request-body buffering fix in `upstream.ts`
  - **Source**: A.11 · INT-016, INT-044, INT-046
  - **Output**: `docs/architecture/20-bff.md#body-buffering`
  - **Must document**:
    - Failure: streamed bodies went out chunked with no Content-Length; Django read an EMPTY body; every `/api/v1/*` passthrough write answered 400 «required field» (e.g. `POST /api/v1/pwa/install-event/`).
    - Fix in `src/lib/bff/upstream.ts` + `forwardLive`: bodies buffered (`null` when empty or already used; `duplex: "half"` only for an explicit stream).
    - Dependent features: B2B draft POSTs and courier action POSTs only reach Django with a body since this fix.
    - 8 MB bound and Nginx `client_max_body_size 8M` parity.
  - **Done when**: the page includes a regression test recipe (passthrough POST with JSON body).
  - **Status**: written in official Step 07 (2026-10-27): `docs/architecture/20-bff.md#body-buffering` (failure, fix with null-when-empty and duplex only for explicit streams, dependent B2B/courier/PWA writes, size-layer table, 4-step regression recipe with a JSON passthrough POST).

### 3.4 Security architecture

Identities, sessions, CSRF, authorisation, secrets and anti-abuse measures across the platform.

- [x] **DOC-465** — Document identities and session establishment (7 identities)
  - **Source**: A.4 · INT-003, INT-022, INT-030, INT-046, INT-048, INT-049
  - **Output**: `docs/architecture/30-security.md#identities`
  - **Must document**:
    - Storefront visitor: anonymous Django session on the store host (cart, `wishlist_phone`, holds, OTP keys, `applied_coupon_id`, `cart_bookings`/`buy_now_bookings`, buy-now cart).
    - Store owner: session `is_merchant_authenticated` + `auth_tenant_schema` pinned to the store (`TenantHeaderOverrideMiddleware` refuses switching); login = store WhatsApp phone + password (`merchant_login`); `MerchantSessionAuthentication` enforces CSRF on every write.
    - Staff: `auth/staff/login/` (phone + password, `StaffSession`, session pinned, 15-min lockout, phone matched across 967…/0…/local forms, roster enforcement `enforce_roster_schedule` in store timezone with 0 = Sunday, no roster = no restriction), `request.staff` / `resolve_request_staff`, `permission_resolver`; `StaffSession.device_label`.
    - Courier agent: staff session whose `shipping_provider_profile` is the agent (owner → 403 in the agent app).
    - Platform console user: Django admin session on public; superuser «مالك المنصة», `is_staff` «مشرف تشغيلي» (reads everything, writes dues/Sharwa Pay only); `ConsoleSessionAuthentication` 401 with `WWW-Authenticate: Session`; lock after 5 failures per username / 15 min; per-IP ceiling 100.
    - Sharwa Pay customer: WhatsApp OTP on the platform origin; session key `sharwa_pay_auth_phone` shared with the legacy page; `cycle_key()` on login.
    - Multi-store owner: owner session + `MerchantAccount` linked to the current store (prefer `owner_phone` = `merchant_phone`, raw or cleaned).
    - Personal access tokens (`shw_pat_…`, returned once, SHA-256 stored, 90-day expiry, `name`/`last_used_at`), trusted devices (`TrustedDevice.staff/last_seen_at`, removal = deactivate); termination soft (`terminated_at`, `is_active=False`, `token_version+1`, sessions + tokens revoked).
  - **Done when**: each identity has a login → session → logout sequence and the auth class that checks it.
  - **Status**: written in official Step 08 (2026-10-27): `docs/architecture/30-security.md#identities` (8-identity summary table with login, session evidence, checking auth class, pinning, lockouts and logout; a login → session → logout Mermaid sequence per identity; trusted devices, staff rules, soft termination).

- [x] **DOC-466** — Document CSRF handling end to end
  - **Source**: A.4 (CSRF paragraph) · INT-030, INT-048
  - **Output**: `docs/architecture/30-security.md#csrf`
  - **Must document**:
    - Django `CSRF_COOKIE_HTTPONLY=True`; browser never reads cookies; `GET /api/bff/auth/csrf` → Django `GET /api/v1/auth/csrf/` (`{csrfToken}` via `get_token`, Set-Cookie forwarded so the pair matches).
    - `api-client.ts` sends `X-CSRFToken` on unsafe methods, refreshes the token once and retries on a CSRF 403.
    - `(admin)` layout bootstraps CSRF like the dashboard; console login answers the rotated `csrf_token`.
    - Sharwa Pay enforces CSRF on every write including OTP login.
  - **Done when**: the token lifecycle is diagrammed for dashboard, console and Sharwa Pay.
  - **Status**: written in official Step 08 (2026-10-27): `docs/architecture/30-security.md#csrf` (six design rules, who-enforces table per surface, token-lifecycle Mermaid diagrams for dashboard, console and Sharwa Pay).

- [x] **DOC-467** — Document the authorisation model (gate order, permission keys, owner-only areas)
  - **Source**: A.5 · INT-022 (M18)
  - **Output**: `docs/architecture/31-authorization.md`
  - **Must document**:
    - Gate order: session (401) → plan feature (403, e.g. `{detail, code: feature_disabled}`) → M18 permission key (403) → owner-only (403) → resource state (404/409); owner implicitly holds every key.
    - Full key list: `orders.view`, `orders.update_status`, `orders.process_returns`, `orders.refund`, `orders.create_b2b`, `orders.approve_b2b`, `customers.view`, `customers.edit_profile`, `catalog.manage`, `discounts.apply`, `discounts.manage`, `inventory.view`, `inventory.adjust`, `inventory.writeoff`, `reports.view`, `reports.sales.view`, `reports.export`, `staff.view`, `staff.manage`, `staff.manage_roles`, `staff.manage_assignments`, `staff.view_sessions`, `suppliers.manage`, `suppliers.approve`, `channels.inbox.access`, `channels.marketplaces.manage`, `channels.dropshipping.manage`, `support.takeover_session`, `expenses.manage` (new, category «المالية», seeded to «مدير المتجر» + «مدير الفرع», migration `0235`).
    - `permission_resolver` order: active location roles ∪, then global + that location's overrides (verified equal to `resolve_context()`); permission categories seeded in English served in Arabic; system roles read-only (FR-18.04).
    - Role-based extras: `Role.max_discount_percent` (POS ceiling), approver roles on `ApprovalRequest`, «مدير الفرع|المتجر» for POS variance; self-approval 403; a member never edits own assignments/overrides nor terminates themselves.
    - `catalog.manage` gate for catalog edits (owner + «مدير المتجر» + «مدير الفرع»), never hardcoded role names; sidebar gates accept permission lists (any-of).
    - Owner-only areas: store settings money/structure sections, design (M08), carts/campaigns/timeline/loyalty/gifting (M13), payments & merchant wallet (M14), shipping settings (M15), locations structure (M22), domains & integrations (M19), affiliate/influencer writes (M17), channel settings (M27), app installs + template edits (M30), Sharwa AI writes/console token (M31), Sharwa Ship writes + supervision (M39), multi-store rollup (M43), push broadcast (M44).
    - Additional per-service checks: `StaffChannelAccess` whitelist (M27), agent ownership `_agent_owns` (M38), POS locations = active `StaffLocationRole` ∩ `has_pos_terminal`.
  - **Done when**: a matrix of module × gate step exists and matches the test suites.
  - **Status**: written in official Step 08 (2026-10-27): `docs/architecture/31-authorization.md` (gate-order flowchart, `resolve_context` rules, 36-key catalogue with seeding migrations and role grants, role-based extras, service-level checks, owner-only areas, 42-row module × gate matrix naming the test that pins each gate).

- [x] **DOC-468** — Document secrets handling and credential storage
  - **Source**: INT-020, INT-021, INT-023, INT-037, INT-038, INT-039, INT-040, INT-041
  - **Output**: `docs/architecture/32-secrets.md`
  - **Must document**:
    - Payment gateways: fields from `GATEWAY_REGISTRY.credential_fields` (jeeb: `merchant_id/base_url/api_key/api_secret`; kuraimi: `merchant_code/base_url/api_key/api_secret`); no secret leaves the service; `masked_hint` «••••» + last 4; `value` only for non-secret fields; empty field on PUT keeps stored value.
    - Carriers: `CARRIER_REGISTRY` (aramex username/password/account_number/account_pin — `account_pin` now secret, SC-15.4; smsa username/password) stored in `ThirdPartyLogisticsClientAgreement` (`merchant_own`); platform shared account never exposed; empty secret keeps stored.
    - Encrypted `StoreAppInstallation` credentials (channels, marketplaces, dropshipping, WhatsApp) + public bridge indexes; disconnect clears credentials + bridge rows; secrets never returned (FR-27.08).
    - Webhook secret `whsec_…` encrypted, returned once (create/rotate); dropshipping webhook rotate returns URL + signing secret once with `no-store`.
    - PATs SHA-256; staff `temporary_password` returned ONCE.
    - CAPI tokens write-only (`has_*`, empty keeps, null clears, < 10 or > 255 refused).
    - POS manager code stored hashed (`StoreSetting.pos_manager_code_hash`).
    - SSO keys and `SHARWA_AI_CONSOLE_URL` (503 when missing).
  - **Done when**: every secret type lists where it is stored, how it is masked and how it is rotated.
  - **Status**: written in official Step 08 (2026-10-27): `docs/architecture/32-secrets.md` (three storage patterns and the encryption scheme, 14-row register — where stored, how protected, how masked, how rotated — platform env secrets by name, one-time secret responses and their `no-store` status).

- [x] **DOC-469** — Document OTP and code-verification designs (HMAC, limits, locks)
  - **Source**: INT-003, INT-004, INT-014, INT-028, INT-029, INT-033, INT-048
  - **Output**: `docs/architecture/33-otp.md`
  - **Must document**:
    - Merchant forgot/reset password: WhatsApp code to the store number, HMAC in cache, 3 sends / 10 min, lock after 3 wrong codes.
    - Onboarding OTP verify/resend (410 after 30 min, 429 + `Retry-After`).
    - COD OTP `checkout/cod-otp/send|verify/`: device tracker in public + session/phone limits; device id derived from session when absent.
    - Sharwa Pay checkout OTP `checkout/sharwa-pay/otp/send/`.
    - Wallet/loyalty OTP (WALLET_OTP session keys; `loyalty/redeem/` marks phone verified 10 min).
    - Customer OTP `customers/otp/send/` purposes `review|auction|wishlist|back_in_stock`, 60 s resend → 429.
    - POS large-refund OTP: `OTPChallenge(large_refund)` bound to receipt + amount, store WhatsApp, 3 sends/10 min, 3 wrong → 429 lock 15 min; DEBUG `123456`; manager code 5 wrong / 15 min lock per register.
    - Sharwa Pay login: code bound to the session, stored as HMAC never plain, 3 sends / 10 min per NUMBER (cache), 5 wrong → 5-min lock per number, 429 with `retry_after` + `Retry-After`, WhatsApp failure 502, reasons `no_code`/`expired`/`invalid`, `expires_in: 600`.
    - Ordering rule: field errors before any OTP is consumed (checkout); loyalty check before other OTPs.
  - **Done when**: a table lists every OTP flow with channel, TTL, send limit, attempt limit, lock and storage.
  - **Status**: written in official Step 08 (2026-10-27): `docs/architecture/33-otp.md` (10-row register of every OTP/code flow with channel, TTL, send limit, attempt limit, lock, storage, responses and test; checkout check order; POS large-refund sequence).

- [x] **DOC-470** — Document rate-limiting policy (CGNAT stance)
  - **Source**: INT-016, INT-030, INT-014, INT-036, INT-029, INT-019 · decisions
  - **Output**: `docs/architecture/34-rate-limits.md`
  - **Must document**:
    - Yemeni ISPs use CGNAT: phone-number limits for anti-spam, per-IP only as very loose ceilings.
    - Concrete limits: PWA install-event per-IP 30/min → 300/min; push subscribe 120/min; console per-IP 100; checkout 429 within a minute of the last order; store-reviews 3 per session/hour; holds 10 live per session; push test 429 + `Retry-After` within 60 s; customer export 429 on hard limit or a critical behaviour alert; dropshipping connect 429 from supplier rate limit.
    - `Retry-After` header convention.
  - **Done when**: every limit is listed with key (phone/session/IP/number) and response.
  - **Status**: written in official Step 08 (2026-10-27): `docs/architecture/34-rate-limits.md` (CGNAT stance with evidence, `RealIpMiddleware`, per-group register of every 429 with key, limit, window, response and storage, `Retry-After` convention).

- [x] **DOC-471** — Document outbound-request safety (webhooks SSRF, OAuth return URLs, SSO handshake)
  - **Source**: INT-023, INT-037, INT-038, INT-041
  - **Output**: `docs/architecture/35-outbound-and-redirect-safety.md`
  - **Must document**:
    - Webhook endpoints https-only; SSRF guard (internal hosts and non-global IPs refused at save and re-checked at send, no redirects).
    - OAuth start (channels Meta/TikTok, Amazon SP-API) stores a validated same-store `/dashboard/…` return URL (no open redirect); callbacks return `?connected=<code>` or `?oauth_error=<reason>`; Amazon callback pins amazon.sa automatically; legacy hub flow unchanged.
    - Sharwa AI console SSO: RS256 `issue_console_token(tenant_ref=schema, sub=merchant:<schema>, role=merchant_admin)`, `{console_url, token, expires_in}` (900 s in mock), session pinned via `auth_tenant_schema`, `Cache-Control: no-store` + `Referrer-Policy: no-referrer`; Next fix: never put token in URL — open plain console URL, wait for `sharwa-console-ready` from that window and origin, post `sharwa-console-token` once to that origin; unclaimed token dropped at `expires_in` or unmount; trusted origin derived from `console_url` (not hard-coded `https://ai.sharwa.app`).
    - Telegram connect getMe → setWebhook.
  - **Done when**: each outbound/redirect surface has its validation rule and test reference.
  - **Status**: written in official Step 08 (2026-10-27): `docs/architecture/35-outbound-and-redirect-safety.md` (webhook https-only and host guard at save and send, OAuth return-URL validation and callbacks, Sharwa AI RS256 SSO and the `postMessage` handshake, Telegram connect — each with its test).

- [x] **DOC-472** — Document anti-impersonation and ownership fixes
  - **Source**: INT-016, INT-046, INT-049, INT-031
  - **Output**: `docs/architecture/36-ownership-checks.md`
  - **Must document**:
    - Push subscribe derives phone from `order_uuid` (client `customer_phone` ignored; anonymous = broadcast only; anonymous re-subscribe keeps linked phone; unknown order 400 `{order_uuid}`).
    - Courier app: agent could end/hand over ANY shift, move ANY shipment, scan/deliver ANY fulfillment → now own only (`_agent_owns`, 404), owner acts via `agent_id`, closed shift cannot be ended again, no handover to self or inactive agent, inactive profile cannot act (`_resolve_agent`).
    - Rollup account rule: account LINKED to the current store (HTML page matched phone only and could leak another account's stores).
    - Sharwa Pay: a top-up that matched no wallet is linked on approval only to an existing wallet of its claimed phone — never a wallet created for an unproven number.
    - Support: staff_close refuses a session another member holds.
  - **Done when**: each fix lists the previous hole, the new rule and the test that pins it.
  - **Status**: written in official Step 08 (2026-10-27): `docs/architecture/36-ownership-checks.md` (12-row register — previous hole, new rule with file and function, Arabic violation response, pinning test — courier decision flowchart, push-subscribe sequence).

- [x] **DOC-473** — Document audit trails and data redaction
  - **Source**: INT-022, INT-030, INT-042, INT-007, INT-026, INT-035, INT-036, INT-017
  - **Output**: `docs/architecture/37-audit.md`
  - **Must document**:
    - `AuditLog` append-only, read-only API, hash chain `verify_chain()` (`broken_at` = row number in insert order); audited actions incl. `staff.terminate`, `customers.export`, `customers.cod_disabled|enabled`, `affiliate.payout`/`influencer.payout`, `booking.cancel`, `order.*`, `po.<kind>`, returns and RMA events.
    - `PlatformActionLog` for every console action (FR-20.07 «من نفّذ», read-only in Django admin).
    - Product change log entries (tier prices, extras) under the actor's name.
    - Staff usage tracking (`view_volume`, `export_volume`) and `BehaviorAlert` (`value/limit`).
    - Support tool-call logs redact token/secret/password/api-key/OTP/PIN/card values server-side (FR-31.07).
    - `Cache-Control: no-store` on tracking (+ `X-Robots-Tag: noindex`), Sharwa Pay, connect-url, console token, webhook rotate.
  - **Done when**: all audit stores and redaction points are listed with retention notes.
  - **Status**: written in official Step 08 (2026-10-27): `docs/architecture/37-audit.md` (`AuditLog` protection and hash-chain algorithm, `verify_chain`, register of every `action_code`, console `PlatformActionLog` actions, change log, usage counters and `BehaviorAlert`, support redaction, no-store points, retention per store).

### 3.5 Data & money integrity

How money, stock, approvals and concurrent writes stay correct.

- [x] **DOC-474** — Document money representation and formatting
  - **Source**: A.6 · INT-012, INT-013, INT-020, INT-033, INT-034, INT-039, INT-043, INT-048
  - **Output**: `docs/architecture/40-money.md`
  - **Must document**:
    - Every amount crosses the API as a server-formatted string `display_*` from `products.models.base.format_money`: SAR «1,250 ر.س» integral / «12.50 ر.س»; USD «$1» / «$12.50»; YER_OLD/YER_NEW rounded integer «… ر.ي»; browser never parses/sums/re-formats (`displayMoney = z.string()`).
    - Currencies `SAR`, `USD`, `YER_OLD` («ريال يمني (صنعاء)»), `YER_NEW` («ريال يمني (عدن)»); totals per currency never summed (dues «2.50 ر.س · $1», POS store currency, expenses month totals, Sharwa Pay four rows).
    - Conversion points: storefront `_convert_value_to_target` with `?currency=`; free-shipping threshold compared in dashboard currency (`build_order_invoice`); FX 4 decimals (`0217`); POS converts to store currency; dropshipping `StoreSetting.usd_to_sar` = «daily» rate; affiliate amounts stored SAR shown in store currency; marketplace price → SAR → × fx → × (1 + markup); chat-to-order store currency fix; B2B draft lines converted from product currency.
    - Legacy bug: `get_formatted_price` dropped «ر.ي» for YER (fixed by `format_money` on cards).
    - Customer wallet always SAR (FR-07.04); `Decimal(14,2)` expenses.
  - **Done when**: the page lists every conversion site and the formatting function used.
  - **Status**: written in official Step 08 (2026-10-27): `docs/architecture/40-money.md` (`format_money` design, four currencies, three conversion engines, precision table, 28-row register of every conversion site with engine, rate source, rounding and formatter).

- [x] **DOC-475** — Document idempotency mechanisms (register)
  - **Source**: A.7 (idempotency) · INT-014, INT-016, INT-019, INT-020, INT-028, INT-033, INT-037, INT-042
  - **Output**: `docs/architecture/41-idempotency.md`
  - **Must document**:
    - Checkout `client_uuid` → unique `Order.idempotency_key` inside the reservation transaction (retries/double clicks return the first order).
    - Merchant withdrawal `Idempotency-Key` (retried POST returns same request 200, no second debit; `MerchantWithdrawalRequest.idempotency_key`).
    - Customer wallet top-up `Idempotency-Key` header/body, unique `WalletTransaction.idempotency_key`.
    - POS `PosIdempotencyKey` inserted first in the write transaction (header or body) — replay returns first receipt/movement/refund (200).
    - Inbox reply `client_id` unique or `Idempotency-Key`; support reply `client_id` unique per session.
    - Campaign send flips status under row lock first (no double send).
    - Push throttle one per (order, kind) per 6 h (cache).
    - Carrier webhook idempotency key `products.tasks.shipping.carrier_idempotency_key` shared by `CarrierWebhookView` and console retry.
    - Pickup code `ensure_pickup_code()` idempotent; notifications sync idempotent with `dedupe_key`.
  - **Done when**: each mechanism lists key source, uniqueness scope and replay response.
  - **Status**: written in official Step 08 (2026-10-27): `docs/architecture/41-idempotency.md` (28-row register with key source, real uniqueness scope, replay response, file:function and test; reconciled with the API page; replay/race sequence).

- [x] **DOC-476** — Document optimistic locking and row-lock conventions (409 register)
  - **Source**: A.7 (optimistic locking) · INT-007, INT-018, INT-021, INT-022, INT-026, INT-033, INT-035, INT-042, INT-047, INT-020, INT-031, INT-045, INT-048
  - **Output**: `docs/architecture/42-concurrency.md`
  - **Must document**:
    - Orders `select_for_update` + `version` → 409 `{detail, current_version, order}`; theme `version` → `{detail, current_version}` (`StoreSetting.theme_version`); convert-to-pickup → `{detail, current_version, status}`; approvals `ApprovalRequest.resolve()`; returns `{detail, current_version}`; POS shift `version`; purchase orders `version` «حُدِّث الأمر من مستخدم آخر.»; support session `version` → `{detail, session}`; Sharwa Ship detail `version` = accepted transitions + 1 (no column).
    - Row locks before every money decision: console dues/top-ups/withdrawals, merchant withdrawal decisions, auctions, `SharwaPayWalletManager`, import jobs (200-row chunks under job row lock).
    - Partial unique constraints as race guards: `BookingSlot (product, start_datetime)` on held/booked (IntegrityError ⇒ 409); tier price unique constraint race → same message; keyword uniqueness.
    - Concurrency bug fixed: two concurrent «reject» withdrawal clicks used to refund twice → `payments_service.decide_withdrawal`.
  - **Done when**: the convention (which resources carry `version`, the 409 body shape) is a single reference table.
  - **Status**: written in official Step 08 (2026-10-27): `docs/architecture/42-concurrency.md` (single `version` reference table with 409 body and Arabic `detail`, row-lock register, race-settling constraints, the `decide_withdrawal` fix, stale-version sequence).

- [x] **DOC-477** — Document wallet and ledger managers (merchant wallet, customer wallet, Sharwa Pay, dues)
  - **Source**: Domain 8 relationship · INT-020, INT-028, INT-031, INT-048, INT-026
  - **Output**: `docs/architecture/43-ledgers.md`
  - **Must document**:
    - Three money ledgers: merchant wallet (store schema `MerchantWalletTransaction` with `kind` + `reference_kind/reference_id`, writers `merchant_credit_service` order_payment, `refund_service` refund, cancellation adjustment, withdrawals), operating expenses (store schema, not editable/deletable — 405), Sharwa Pay (public, four currency balances).
    - Withdrawals debited at request time and refunded on rejection (merchant: `decide_withdrawal`; Sharwa Pay: console reject credits `withdrawal_reversal` in the same transaction); derived `available` / `display_reserved` / `display_balance`.
    - `SharwaPayWalletManager.credit/debit`: row lock + audit row in one transaction; `apply_credit_if_approved` behind the `credited_at` guard (never double credit); `topup_auto` = transaction id with NO receipt (Kuraimi webhook only), customer top-ups `topup_manual` («شحن بمراجعة»); withdrawal description carries `#<request id>`; login never creates a wallet, first top-up does; `bank_transaction_id` unique at DB level.
    - Dues: `PlatformCommissionRecord` / `AppBillingCharge`; `.collect()` the only debit, from the merchant's Sharwa Pay wallet; `commission_enabled` from `PlatformBillingSettings`.
    - Customer wallet (`WalletTransaction` with `actor` default «النظام», `redeem_points_to_wallet` inside the order transaction, `OrderDraft.wallet_cap_sar`, never spend existing balance without consent); refund `wallet_credit` path; any money failure rolls the whole return approval back.
    - Sharwa Ship waybill fee debited from the store's Sharwa Pay wallet atomically with the AWB (`issue_waybill`).
    - Affiliate/influencer owed = pending commissions of paid non-cancelled orders minus clawback; mark-paid oldest first within net allowance, `dry_run`.
  - **Done when**: each ledger has its writers, invariants and reversal path documented.
  - **Status**: written in official Step 08 (2026-10-27): `docs/architecture/43-ledgers.md` (six ledgers — schema, models, every writer, invariants and enforcement, reversal path, derived figures — and a Mermaid money-flow diagram).

- [x] **DOC-478** — Document the stock ledger and multi-location stock model
  - **Source**: Domain 10 relationship · INT-024, INT-025, INT-026, INT-033, INT-035, INT-045, INT-005
  - **Output**: `docs/architecture/44-stock-ledger.md`
  - **Must document**:
    - One ledger `StockMovement` (fields `actor`, `quantity_after`, `reference_type`, `reference_id` from `0225`) fed by adjustments (`manual_adjust`/`restock`), write-offs, sales, returns (`refund_restock` «إرجاع #id»), RMA (`RMA-<id>`), POS (`sale`), PO receiving (`po_received` with reference + actor), serials; `record_stock_movement` fills actor from `acting_as` else «النظام».
    - Multi-location on: `LocationInventory` rows are the source; a mirror signal rewrites variant/product stock; quarantine ≤ on-hand − reserved; reorder point falls back to product low-stock threshold. Off: variant stock → `recalculate_stock_from_variants` (bug fixed in PO receiving flat mode); returns restock writes product/variant stock directly when multi-location is off (mirror signal skipped those stores).
    - `InventoryReservation` (expired active holds shown `released`, self-healing #33; refs `order:N`, `b2b:N`, cart); `InventoryItem` serial units (`location`, `order`, `meta.order_id` fallback); `DropshipStockHold`.
    - Stock moves via `F()` never hit `save()` (why low-stock webhooks are a Beat job).
    - Products: variant-sum stock mirror, `<sku>-<n>` variant SKUs, auctions forced stock 1, serial stock = available units, a saved product sends `stock` only when edited (INT-005 fix).
    - Multi-location toggle off with stock in > 1 location → 409 `{detail, conflicts}` unless `merge: true`.
  - **Done when**: a diagram shows every movement source writing to the ledger and the mirror path.
  - **Status**: written in official Step 08 (2026-10-27): `docs/architecture/44-stock-ledger.md` (`StockMovement` fields and actor rule, 14 movement sources plus stock changes without a movement, multi-location on/off and mirror, reservations, serials, dropship holds, Mermaid source → ledger → mirror diagram).

- [x] **DOC-479** — Document the approvals queue architecture
  - **Source**: INT-022, INT-024, INT-033, INT-035, INT-044, INT-007
  - **Output**: `docs/architecture/45-approvals.md`
  - **Must document**:
    - `ApprovalRequest` (`payload` snapshot + nullable `location` from `0225`; `target_ref` + `amount` derive `payload`/`summary`/`entity`; `available=false` when target gone).
    - Kinds: `stock_writeoff` (nothing deducted until approved; `apply_writeoff` in the same transaction, refused 400 if stock no longer covers), `po_approval` (`resolve_purchase_order`; reject → draft; cancel closes pending as rejected «أُلغي أمر الشراء.»), B2B drafts (`resolve_order_approval`, escalation `escalated_at`), POS `shift_shortage` (`settle_shift_for_approval`), POS `discount_exception` (one receipt per approval).
    - Decider rules: optimistic lock → 409, self-approval 403, staff decider must hold `approver_role` at the location or `staff.manage`; owner shows «مالك المتجر».
    - `approval_pending` notifications to approver role only.
  - **Done when**: every approval kind lists creator, approver, effect on approve/reject and service function.
  - **Status**: written in official Step 08 (2026-10-27): `docs/architecture/45-approvals.md` (`ApprovalRequest` model and migrations, six kinds with creator, approver, approve/reject effects and service function, lifecycle state diagram, decider rules, escalation, `approval_pending` audience).

- [x] **DOC-480** — Document timelines, change logs and notification generation
  - **Source**: INT-007, INT-026, INT-035, INT-009, INT-005, INT-044, INT-045
  - **Output**: `docs/architecture/46-timelines-and-notifications.md`
  - **Must document**:
    - Order timeline = created + `AuditLog(order.*)` + `ShipmentEvent` + `OrderRefund` (no new model); return timelines and RMA events in `AuditLog` (pre-INT-026 rows derive from timestamps); PO timeline `po.<kind>` (legacy orders derive «created»).
    - Product change log under the actor (tier prices, extras).
    - Notification model (`Notification` with `dedupe_key`, audience `permission`/`merchant_only`/`audience_role`/`audience_staff`, `resolved_at`; `NotificationRead` per reader `owner`|`staff:<id>`), throttled 20 s/store idempotent sync from sources (`order_new` 72 h, `payment_review`, `approval_pending`, `behavior_alert`, `inbox_unread`, `low_stock`, `sync_failed`, `awb_failed`, `export_ready`, `billing_notice` ≤ 7 d, `provisioning_notice`); stateful kinds resolve/reopen (FR-49.11); 30-day window, `history=1`.
  - **Done when**: each timeline source and notification kind is traced to the code that writes it.
  - **Status**: written in official Step 08 (2026-10-27): `docs/architecture/46-timelines-and-notifications.md` (order, return/RMA, PO timelines and product change log traced to their writers; notification sync design; 11-kind table traced to the writing code).

### 3.6 Data model reference per domain

One page per domain listing the models the APIs read and write, where they live (public/tenant), the fields added in Phase 002 and the service layer that owns them. Each page also lists the legacy HTML views kept alongside the API.

- [x] **DOC-481** — Write the data-model page for Domain 1 (public site, onboarding, tenant resolution)
  - **Source**: INT-001 (M01), INT-002 (M47), INT-004 (M02) · Domain 1
  - **Output**: `docs/architecture/data-model/01-public-onboarding.md`
  - **Must document**:
    - Providers: `api/views_public.py` (`public/plans/`, `public/stats/`, cached 1 h; free-plan fallback `freePlanHighlights` on the frontend), `api/views_onboarding.py`, legacy `/register/check-subdomain/`, `/register/status/<token>/`.
    - Models: `Plan` (public listing), market categories (`stores_count` from registration), pending registration (30-min lifetime), `tenants.Client`/`Domain`, provisioning status fields.
    - Middleware placement (`TenantHeaderOverrideMiddleware`, `TenantProvisioningGuardMiddleware`).
    - No migration in INT-001/002/004; UX gap fixed in `otp-form.tsx` (410 resend returns to panel 01 with draft kept).
    - Tests: `api/test_public_api.py`, `api/test_tenant_guard_api.py`, `api/test_onboarding_api.py`.
  - **Done when**: ER sketch + provider table complete.
  - **Status**: written in official Step 37 (2026-10-28): `docs/architecture/data-model/01-public-onboarding.md` (Client/Domain/provisioning fields, Plan/Feature/Subscription, MarketCategory, pending registration (cache, not a model), middleware placement, ER sketch, provider table, tests; 3 discrepancies).

- [x] **DOC-482** — Write the data-model page for Domain 2 (dashboard shell, auth, search, notifications, multi-store)
  - **Source**: INT-003 (M03), INT-008 (M48), INT-009 (M49), INT-049 (M43) · Domain 2
  - **Output**: `docs/architecture/data-model/02-dashboard-shell.md`
  - **Must document**:
    - Providers: `api/views_auth.py`, `api/views_dashboard.py`, `products/services/dashboard_service.py` (today = `DailyStoreMetrics`; refresh shares the M25 5-min cooldown cache key; low stock `product_service.low_stock_count()`; staff blocks zeroed per permission; refresh needs `reports.sales.view` for staff), `products/services/search_service.py` + `api/views_search.py` (no index, no migration; `lower(translate(…))`; ≥ 2 chars, limit 5 max 10; orders need `orders.view`, customers `customers.view` (phone groups from orders), archived products last), `products/models/notifications.py` (`Notification`, `NotificationRead`, migration `0216_notifications`), `products/services/notification_service.py`, `api/views_notifications.py`, `tenants/merchant_rollup.py` + `api/views_rollup.py`.
    - Models: `StaffSession`, `DailyStoreMetrics`, `MerchantAccount`, `MerchantAccountClient`, `TenantStatsSnapshot` (orders/completed/refunded/revenue_sar).
    - Rollup computation: range default last 30 days in store timezone, reversed swapped, echo applied range; per store in-range sums, `last_snapshot_date` overall, sort revenue desc then name; legacy HTML `merchant/master-dashboard/` untouched.
    - Legacy HTML kept: merchant master dashboard.
    - Tests: `api/test_dashboard_api.py`, `api/test_search_api.py`, `api/test_notifications_api.py`, `api/test_rollup_api.py` (4).
  - **Done when**: every model and service of the domain is on the page.
  - **Status**: written in official Step 37 (2026-10-28): `docs/architecture/data-model/02-dashboard-shell.md` (StaffSession, DailyStoreMetrics, Notification/NotificationRead, MerchantAccount(+Client), TenantStatsSnapshot, overview/search/notification/roll-up services; 2 discrepancies/notes).

- [x] **DOC-483** — Write the data-model page for Domain 3 (catalog, products, advanced products)
  - **Source**: INT-005 (M04), INT-006 (M05), INT-045 (M37) · Domain 3
  - **Output**: `docs/architecture/data-model/03-catalog.md`
  - **Must document**:
    - Providers: `api/views_products.py`, `api/serializers_products.py`, product/variant/template services (migrations `0211`–`0215`: ProductTemplate blueprint fields as one JSON field, images unified under gallery model, decimal min/max quantities, change-log author, swatch colours), `api/views_catalog.py` (categories + reorder with global `sort_order`, brands, tags + merge, collections + products add/reorder/remove, badges), `products/services/product_extras_service.py`, `api/views_product_extras.py`, `products/services/product_import_service.py`, `products/services/storefront_auction_service.py`.
    - Models: `Product`, variants, `ProductTemplate` (35 central sectors/templates/attributes), categories, brands, tags, collections, badges, `BundleComponent`, `CompatibilityRule` (operators equals/not_equals/in), `PersonalizationField` (9 types), `Auction`, `AuctionBid`, `InventoryItem` (serials), tier prices, `ProductImportJob` + `OrderItem.personalization` (migration `0236_advanced_products_api`), `RelatedProduct`.
    - Import engine: dropshipping `FeedReader` (csv/tsv/txt/xlsx, UTF-8 or Windows-1256, delimiter sniffed, ≤ 20,000 rows), chunks of 200 under the job's row lock on run and each poll (no Celery), imported products are drafts, category by exact name, 409 once run; export with list filters/ordering, BOM.
    - Auction engine: draft row created on first read, active past `end_at` closed on read, row lock, anti-sniping extension, buy-now ends it, buyer-currency comparison, `reserve` never exposed, `reserve_met` only once ended.
    - `tier_pricing.personalization_extra` (cart charges personalization surcharges per unit).
    - Legacy HTML kept: `ProductForm`, one-step HTML CSV import.
    - Tests: `api/test_products_api.py`, `api/test_catalog_api.py`, `api/test_catalog_serializers.py`, `api/test_product_extras_api.py` (10).
  - **Done when**: all models with Phase 002 field changes and the three BFF switches are listed.
  - **Status**: written in official Step 37 (2026-10-28): `docs/architecture/data-model/03-catalog.md` (25 models with schema placement, migrations 0206–0236, the three BFF switches, import, auction and personalization engines; 7 discrepancies).

- [x] **DOC-484** — Write the data-model page for Domain 4 (orders, returns, RMA)
  - **Source**: INT-007 (M06), INT-026 (M24) · Domain 4
  - **Output**: `docs/architecture/data-model/04-orders-returns.md`
  - **Must document**:
    - Providers: `products/services/order_api_service.py` reusing `Order.set_fulfillment_status`, `cancel_order`, `release_reserved_stock`, `process_order_refund`, `process_order_merchant_credit`, marketplace `order_guard`, `create_b2b_draft_order`, `convert_order_to_pickup`, transitions copied from `update_order_status` / `confirm_payment_received` / `adjudicate_*`; `api/serializers_orders.py`, `api/views_orders.py`; `products/services/returns_api_service.py` + `api/views_returns.py` (re-exported from `api/views.py` for `api/tests.py` / `products/test_returns_b2b_api.py`), new `return_service.restock_to_location`.
    - Models: `Order` (`version`, `idempotency_key`, `pickup_location`, `delivery_latitude/longitude`, `zone_review_resolved_at`, `coupon_code`, `sales_channel`, `source_location`, financial `status` + `fulfillment_status`), order statuses (custom, `releases_stock` flag), `OrderItem` (`source_location`, `personalization`), `OrderRefund`, `ReturnRequest` (`decision_note`), RMA, `AuditLog`.
    - Django-authority differences from mock (releases_stock restocks without cancel; rejecting payment_review cancels + restocks; B2B drafts need a staff session; gift message max 300).
    - Returns behaviour: per-line errors, approve restocks to `location_id`, wallet/store_credit via `process_order_refund('wallet_credit')`, `CashLiquidityError` 400, RMA quarantine → on-hand with `restock_movement_id`.
    - No migration in INT-007/INT-026.
    - Legacy HTML kept: order screens, returns screens.
    - Tests: `api/test_orders_api.py`, `api/test_returns_api.py` (8), legacy tests updated (feature patch, cash = 400, paid order for wallet credit).
  - **Done when**: the order two-axis state model and refund/return flows are diagrammed.
  - **Status**: written in official Step 37 (2026-10-28): `docs/architecture/data-model/04-orders-returns.md` (11 models, financial/payment/fulfillment state model, refund and return flows, RMA states, Django-authority differences; 7 discrepancies).

- [x] **DOC-485** — Write the data-model page for Domain 5 (storefront, cart, checkout, tracking, PWA, engagement)
  - **Source**: INT-011 → INT-016, INT-029 · Domain 5
  - **Output**: `docs/architecture/data-model/05-storefront.md`
  - **Must document**:
    - Providers: `storefront_catalog_service.py`, `api/views_storefront.py`, `storefront_product_service.py` (via `ProductDetailSerializer.to_representation`), `storefront_cart_service.py` (`products/cart.py` session cart + `pricing.build_order_invoice`), `storefront_checkout_service.py` + `api/views_checkout.py` (JSON over the same core as `products/views/cart_checkout.py::checkout` / `checkout_service.py`: `quote_checkout` → `validate_payment_method` → `prepare_direct_payment` → wallet / Sharwa Pay / COD OTP guards → `preflight_supplier_stock` → `reserve_and_create_order` → `charge_direct_payment` → merchant credit, abandoned-cart recovery, server tracking, `notify_order_created`), `order_tracking_service.py` + `api/views_tracking.py`, `api/views.py` PWA rows, `order_push_service.py`, `api/views_push.py`, `engagement_service.py` + `api/views_engagement.py`.
    - Session state: cart, `applied_coupon_id`, `wishlist_phone`, OTP keys, holds, `buy_now_cart`, `cart_bookings`/`buy_now_bookings`.
    - Models: `Coupon`, `AbandonedCart` (`attach_cart_customer`, signed 7-day restore token), `PickupCode` (`ensure_pickup_code()`: 6 unique digits, 30 days, called by `fulfillment_service.mark_fulfillment_prepared` and lazily by tracking), `Fulfillment`/`FulfillmentItem`, `ShipmentOrder`/`ShipmentEvent`, push subscriptions, `StoreReview.rating` (nullable) + `ProductReview.is_approved` (migration `0228_engagement_api`), back-in-stock subscriptions, `PromotionalOffer`.
    - Next-owned assets: manifest, `/icon`, `/sw.js` from `/config/`; SW push payload `{title, body, url}`.
    - Mapping rules: UI `cod` = Django `manual` without receipt; UI `manual` = transfer WITH receipt + amount; receipts JPEG/PNG (`validate_receipt_image`); `ready_for_pickup` meaning; carrier name from 3PL registry.
    - Legacy HTML kept: `order_status_public_view`, `customer_engagement.py` views, store-review form, HTML checkout.
    - Tests: `test_storefront_catalog_api.py`, `test_storefront_product_api.py`, `test_storefront_cart_api.py`, `test_storefront_checkout_api.py`, `test_order_tracking_api.py`, `test_pwa_push_api.py` (+ legacy `products/test_push_notifications.py`, `test_pwa_install_tracking.py`), `test_engagement_api.py` (4).
  - **Done when**: checkout pipeline and session keys are diagrammed.
  - **Status**: written in official Step 37 (2026-10-28): `docs/architecture/data-model/05-storefront.md` (16 models, session-key and checkout-pipeline diagrams, payment mapping, tracking/PWA/engagement rows; 2 discrepancies).

- [x] **DOC-486** — Write the data-model page for Domain 6 (customers, customer wallets, loyalty)
  - **Source**: INT-017 (M07), INT-028 (M35) · Domain 6
  - **Output**: `docs/architecture/data-model/06-customers-wallets.md`
  - **Must document**:
    - Derived customer: no tenant customer model; key `customer_key` (`clean_phone_number` + `966` for 9-digit Saudi mobiles, Arabic digits) across orders, wallets, points, reliability, wishlist, back-in-stock, abandoned carts, reviews; two grouped queries merged in Python, no SQL phone expression; placed orders exclude `pending_payment`; LTV excludes cancelled; marketplace-only ⇒ `phone_available=false`.
    - Providers: `customer_service.py` + `api/views_customers.py`; `wallet_service.py` + `api/views_wallets.py`; `storefront_wallet_service.py`; segments via `campaigns._resolve_raw_recipients` (`dormant_days=90`).
    - Models: `CustomerNote`, `CustomerReliabilityRecord.cod_status_reason/updated_at/updated_by`, `ProductReview.customer_phone` (migration `0218_customer_crm`); `CentralCustomerTrust` (public, chunked IN); `WalletTransaction.actor` + unique `idempotency_key`, `CustomerPointsTransaction.wallet_transaction` (migration `0227_wallets_api`); customer wallets, points, loyalty program.
    - COD enforcement path (`verify_cod_otp` `cod_allowed:false`; checkout refuses `cod` for disabled phone; auto-disable after refusals).
    - Legacy HTML kept: `customer_report`, `products/views/{wallets,loyalty}.py`.
    - Tests: `api/test_customers_api.py`, `api/test_wallets_api.py` (5).
  - **Done when**: the customer key derivation is specified with examples (`77…`/`077…`/`96777…`).
  - **Status**: written in official Step 37 (2026-10-28): `docs/architecture/data-model/06-customers-wallets.md` (derived customer key with a computed examples table, 8 owned models, COD enforcement path, wallet-at-checkout flow; 2 discrepancies and a scope note).

- [x] **DOC-487** — Write the data-model page for Domain 7 (design, marketing, affiliates & influencers)
  - **Source**: INT-018 (M08), INT-019 (M13), INT-034 (M17) · Domain 7
  - **Output**: `docs/architecture/data-model/07-marketing-design-partners.md`
  - **Must document**:
    - Providers: `design_service.py` + `api/views_design.py` (`AdminStoreSectionViewSet` and its router entry removed), `products/theme_presets.py`, `settings_service.patch_announcement`; `marketing_service.py` + `api/views_marketing.py`; `partners_service.py` + `api/views_partners.py`.
    - Models: `StoreSetting.theme_version` + `theme_updated_at`, `StoreSection.label` (migration `0219_theme_version_section_label`), section images stored as files under `<schema>/store_sections/` (`content_data` absolute URL, never base64; data URLs jpg/png/webp/gif ≤ 5 MB); `MarketingCampaign.sent_at`, `PromotionalOffer.buy_condition_type` + `all`/`min_items` (migration `0220_marketing_api`); `Coupon` (+ `influencer`), abandoned-cart settings, timeline events, gift settings, loyalty program; `Affiliate`, `AffiliateClick`, `AffiliateSale` (OneToOne per order), `Influencer`, `InfluencerSale`.
    - Engine: `_buy_x_get_y_discount` now handles `all` and `min_items`; priority higher first; abandoned-cart `_send_one_reminder` shared with scheduled command; `campaigns.resolve_audience`; attribution `create_affiliate_sale` via `sharwa_aff` cookie (HttpOnly, 30 days), `create_influencer_sale` via `Order.coupon_code`; `GOOGLE_FONT_CHOICES`.
    - Legacy HTML kept: `StorefrontDesignForm`, `AnnouncementBarForm`, marketing screens, `products/views/affiliates.py`, `storefront.py` referral rule.
    - Tests: `api/test_design_api.py`, `api/test_marketing_api.py`, `api/test_partners_api.py` (8).
  - **Done when**: all models and the campaign lifecycle are on the page.
  - **Status**: written in official Step 37 (2026-10-28): `docs/architecture/data-model/07-marketing-design-partners.md` (17 models, campaign lifecycle, attribution engines, legacy views, SHARED/TENANT_APPS evidence; 3 discrepancies).

- [x] **DOC-488** — Write the data-model page for Domain 8 (payments, merchant wallet, expenses, Sharwa Pay)
  - **Source**: INT-020 (M14), INT-043 (M33), INT-048 (M40) · Domain 8
  - **Output**: `docs/architecture/data-model/08-finance.md`
  - **Must document**:
    - Providers: `payments_service.py` + `api/views_payments.py` (`GATEWAY_REGISTRY`, `settings_service.patch_payments`, `decide_withdrawal`); `expenses_api_service.py` + `api/views_expenses.py`; `sharwapay/customer_api.py` + `api/views_sharwa_pay.py`.
    - Models: gateway credentials, payout accounts (banks first, duplicate number normalisation, `has_pending_withdrawal` delete guard), `MerchantWalletTransaction.kind` + `reference_kind/reference_id` (backfilled), `MerchantWithdrawalRequest.payout_account` (FK SET_NULL, `payout_destination` snapshot) + `idempotency_key` (migration `0221_merchant_wallet_api`); `PlatformCommissionRecord`, `AppBillingCharge`, `PlatformBillingSettings`; `OperatingExpense` (4 categories, Decimal(14,2), `currency`, indexed `expense_date`, `note`, `created_by` → StaffMember, ordering `-expense_date, -id`; month totals via `TruncMonth` × currency `Sum`); `SharwaPayWallet`, `SharwaPayTopupRequest`, `SharwaPayWithdrawalRequest`, audit rows.
    - Permission seed `expenses.manage` (migration `0235`, same pattern as `0210`); legacy `operating_expenses_view` now `@requires_permission('expenses.manage')`.
    - Legacy HTML kept: `GatewayCredentialForm`, payout forms, wallet page + withdrawal form, admin actions, `operating_expenses_view`, `tenants/sharwa_pay_views.py`.
    - Tests: `api/test_payments_api.py`, `api/test_expenses_api.py` (8), `api/test_sharwa_pay_api.py` (9).
  - **Done when**: the three ledgers' models and writers are on one ER diagram.
  - **Status**: written in official Step 37 (2026-10-28): `docs/architecture/data-model/08-finance.md` (13 models and about 20 writers on one ER diagram, provider table, migrations, legacy views, tests; 3 discrepancies and 3 disagreements with 43-ledgers.md).

- [x] **DOC-489** — Write the data-model page for Domain 9 (B2B wholesale)
  - **Source**: INT-044 (M36) · Domain 9
  - **Output**: `docs/architecture/data-model/09-b2b.md`
  - **Must document**:
    - Providers: `b2b_api_service.py`, `api/views_b2b.py`, `products/services/tier_pricing.py` (`unit_price`: variant price ?? formula ?? highest tier ≤ quantity ?? base; used by `Cart.__iter__` with `tier_prices` prefetched and local import to avoid a circular import, and by B2B drafts with currency conversion), `api/views.py` (drafts).
    - Models: tier prices (unique `(product, min_quantity)`), `ApprovalRequest` (B2B), `NegotiationDraft` (haggling — not wired, no screen).
    - No migration.
    - Tests: `api/test_b2b_api.py` (8).
  - **Done when**: tier price resolution order is documented with an example.
  - **Status**: written in official Step 50 (2026-10-29): `docs/architecture/data-model/09-b2b.md` (12 entities on one ER diagram, draft-order state machine, tier-price resolution order with a worked example, approval flow, tests; 3 discrepancy call-outs, among them the B2B session-gate difference of OI-10). Rescued from a partial GLM run: audited, call-outs added, links to the registers added.

- [x] **DOC-490** — Write the data-model page for Domain 10 (inventory, locations, procurement)
  - **Source**: INT-024 (M21), INT-025 (M22), INT-035 (M23) · Domain 10
  - **Output**: `docs/architecture/data-model/10-inventory-locations-procurement.md`
  - **Must document**:
    - Providers: `inventory_service.py` (`adjust`, `_apply_delta`, `apply_writeoff`) + `api/views_inventory.py`; `location_service.py` + `api/views_locations.py` (`settings_service.set_multi_location`, `location_routing_service._rule_matches`); `procurement_service.py` + `api/views_procurement.py` over `purchase_order_service`.
    - Models: `StockMovement` (+ fields `0225`), `InventoryItem.location/order`, `InventoryReservation`, `ApprovalRequest.payload` + nullable `location`; `Location` (+ `external_refs` `[{system, ref}]`, separate from 3PL `LocationExternalRef`), `LockerDetails.provider_name/locker_code` (capacity ↔ `compartment_count`), `VehicleDetails.driver_phone` (migration `0226_locations_api`), `LocationInventory`, routing rules (priorities renumbered 1..n, generated names), `StaffLocationRole` (one operational role per staff per location); `Supplier.address/tax_number` (phone optional), `PurchaseOrder.notes/version/updated_at` (backfilled from created_at), `PurchaseOrderLineItem`, `number` = `PO-0001` derived (migration `0230_procurement_api`).
    - Mapping: franchise `contract_ends_at` ↔ `contract_end`; supplier contact by channel; `display_type` = `Location.display_type`; parent cycles refused; virtual ⇒ no coordinates.
    - Legacy HTML kept: `inventory_hub_view`, `update_product_stock`, `products/views/locations.py`, supplier/PO screens.
    - Tests: `api/test_inventory_api.py` (9), `api/test_locations_api.py` (8), `api/test_procurement_api.py` (9) + three legacy supplier suites.
  - **Done when**: models and the PO state machine (draft → submitted → approved/rejected→draft → received/cancelled) are diagrammed.
  - **Status**: written in official Step 50 (2026-10-29): `docs/architecture/data-model/10-inventory-locations-procurement.md` (ER diagram, stock/location models and the PO state machine draft → submitted → approved/rejected → received/cancelled, §8.1 Tests; 2 discrepancies: locations 7 tests not 8, four legacy supplier suites not three). Rescued from a partial GLM run; one invalid Mermaid relationship fixed.

- [x] **DOC-491** — Write the data-model page for Domain 11 (shipping, courier app, Sharwa Ship)
  - **Source**: INT-021 (M15), INT-046 (M38), INT-047 (M39) · Domain 11
  - **Output**: `docs/architecture/data-model/11-shipping.md`
  - **Must document**:
    - Providers: `shipping_service.py` + `api/views_shipping.py` (`settings_service.patch_shipping`, `CARRIER_REGISTRY`, new `CarrierAdapter.test_connection()`), `courier_app_service.py` + `api/views_courier.py`, `sharwa_ship_api_service.py` + `api/views_sharwa_ship.py`.
    - Models: `DeliveryMethod` (`is_sharwa_official`), pickup locations, `ShippingProvider` (`staff_account` OneToOne), `ThirdPartyLogisticsClientAgreement`, public `SharwaShipZone` (immutable code slug, optional all-or-none geo bounds, 7-decimal coords), packaging profiles (grams ⇄ `box_weight_kg`), `RestrictedZonePolygon.reason` (polygons `[{lat,lng}]` read by `point_in_polygon`), `DeliverySLARule` (`delivery_method` FK, optional `source_location`), `Order.delivery_latitude/longitude` + `zone_review_resolved_at` (migration `0222_shipping_api`); `ShipmentOrder`, `ShipmentEvent` (flags `out_of_order`/`flagged_for_review`/`is_rejected`), `CourierShift`, `CourierCustodyLedger` (`get_courier_balance`), `PendingAWBQueue`, `CarrierRateCardSnapshot`, `WaybillRegistry`.
    - Engines: single transition gate `apply_shipment_transition` / `ALLOWED_TRANSITIONS`; `issue_waybill` (Sharwa Pay charge atomic with AWB, weight + split + hazard + marketplace guards), `calculate_chargeable_weight`, `split_fulfillment_into_awbs` (master + children), `transfer_shift`, `transfer_custody`, `finalize_partial_delivery`, `resolve_delivery_sla` (zone+method ⟵ zone ⟵ method ⟵ 72 h).
    - Bugs fixed: `connection.schema_name` inside `schema_context('public')`; aramex `account_pin` secret; `convert_order_to_pickup` cancels `label_pending` waybills.
    - No migration in INT-046/INT-047.
    - Legacy HTML kept: `shipping_companies`, `shipping_providers`, `pickup_locations`, `carrier_settings`, `packaging_profiles`, `zone_review`, `update_address_in_transit`, `convert_order_to_pickup`, courier/Sharwa Ship screens.
    - Tests: `api/test_shipping_api.py` (9), `api/test_courier_api.py` (6), `api/test_sharwa_ship_api.py` (7), related fix `products/test_cod_collection.py`.
  - **Done when**: the shipment state machine and custody flow are diagrammed.
  - **Status**: written in official Step 50 (2026-10-29): `docs/architecture/data-model/11-shipping.md` (ER diagram, shipment state machine, custody flow sequence, carriers package, §8.1 Tests; 2 discrepancies: courier 5 tests not 6, `sharwa_ship` 6 not 7). Rescued from a partial GLM run; two invalid Mermaid lines and a wrong `file:line` fixed, nested «» removed.

- [x] **DOC-492** — Write the data-model page for Domain 12 (settings, staff & permissions, domains & integrations)
  - **Source**: INT-010 (M34), INT-022 (M18), INT-023 (M19) · Domain 12
  - **Output**: `docs/architecture/data-model/12-settings-staff-integrations.md`
  - **Must document**:
    - Settings single row reused: `patch_shipping` (M15), `patch_announcement` (M08), `patch_payments` (M14), `set_multi_location` (M22); `StoreConfigSerializer`; `Base64ImageField` for SEO image; FX 4 decimals (migration `0217`).
    - Staff: `products/services/staff_service.py` + `api/views_staff.py`; `StaffMember` (phone + `auth.User` username = phone), roles, overrides, `StaffSession.device_label`, `PersonalAccessToken.name/last_used_at`, `TrustedDevice.staff/last_seen_at`, `RosterSchedule.location` nullable, `BehaviorAlert.value/limit` (migration `0223_staff_api`, `behavior_service`), `ApprovalRequest`, `AuditLog`; role delete PROTECT rules.
    - Integrations: `api/views_integrations.py` over `domain_service.py`, `integrations_service.py` (`TrackingSettings`, `_tracking_scripts.html` partial), `webhook_service.py` (`WebhookEndpoint`, `WebhookDelivery`, migration `0224_webhooks`); `tenants.CustomDomain` (`tenants/0026`); integration status aggregation (13 rows from app installations, channel health, marketplace/supplier connections, carrier state).
    - Legacy HTML kept: seven settings forms + two toggles, `staff_list_view`, `roles_list_view`, `staff_detail_view`, `approval_requests_view` / `resolve_approval_view`, `audit_log_view` / `verify_audit_chain_view`, `behavior_alerts_view`, tracking form.
    - Tests: `api/test_settings_api.py`, `api/test_staff_api.py` (9; 101 incl. legacy), `api/test_integrations_api.py` (21).
  - **Done when**: the settings row ownership map and staff identity model are on the page.
  - **Status**: written in official Step 50 (2026-10-29): `docs/architecture/data-model/12-settings-staff-integrations.md` (settings row ownership map, staff identity model, domains and integrations models, §8.1 Tests; 1 discrepancy: the "101 incl. legacy" staff test count cannot be reproduced from the files found). Rescued from a partial GLM run.

- [x] **DOC-493** — Write the data-model page for Domain 13 (inbox & channels, marketplaces, dropshipping, POS, bookings)
  - **Source**: INT-037 (M27), INT-038 (M28), INT-039 (M29), INT-033 (M16), INT-036 (M26) · Domain 13
  - **Output**: `docs/architecture/data-model/13-channels-operations.md`
  - **Must document**:
    - Channels: `social_channels/{inbox_api_service,channels_api_service}.py`, `api/views_channels.py`; `Conversation` (+ `source_platform`), `Message` (`status 'queued'`, `error_detail`, `client_id`, `product`), `ConversationKeywordTrigger`, `ChannelCatalogSync.last_run_at`, `ChannelCategoryMapping`, `ChannelProductLink`, `StaffChannelAccess`, `ChannelOrderRoutingSettings`, `ChannelReplyTemplate` (migration `0231_inbox_api`); encrypted `StoreAppInstallation` + public `ChannelSessionIndex`; `process_inbound_channel_message`, `chat_to_order_service`, `compose_product_message`; code map UI `meta · tiktok · telegram (+whatsapp)` ⇄ `meta_social_commerce · tiktok_shop · telegram_bot · whatsapp`.
    - Marketplaces: `marketplaces/api_service.py`, `api/views_marketplaces.py`; `MarketplaceSettings`, `MarketplaceListing` (`materialize_listings`, `compute_effective_price`, `set_identifier`), `MarketplaceSyncJob`, `MarketplaceFeed`, `MarketplaceOrderDetail`; `connection_service`, `listing_service`, `bulk_sync_service`; Amazon SP-API OAuth, noon adapter (fake via `NOON_MARKETPLACE_ADAPTER`); no migration.
    - Dropshipping: `suppliers/api_service.py`, `api/views_dropshipping.py`; `SupplierConnection` (+ `catalog_sync_interval_min`, `price_sync_interval_min`, `last_price_sync_at`), `SupplierSyncJob`, `PricingRule` (`scope`, `supplier_code`, `category_prefix`, priority `1000 − priority` mapping), `SupplierProduct`/`SupplierVariant`, `FeedMapping` (+ `schedule_interval_min`, `column_map`), `DropshipStockHold`, `SupplierWebhookEvent`, `SupplierOrder` (migration `0232_dropshipping_api`); adapter registry (CJ real · مخازن/قنوات fake · flat feed), `RuleBook` / `compute_sell_price`, `feed_engine`, `import_service`, `FEED_FIELDS` (+6 fields), `validate_feed`.
    - POS: `pos_service.py`, `api/views_pos.py`; `CashRegister`, `Shift` (`opened_by` nullable, `version`, `approval`, `force_close_notice_seen`, `variance` legacy meaning), `ShiftCashMovement` (`created_by` nullable, `note`), `OTPChallenge`, `PosReceipt` (`POS-<shift>-<seq>`), `PosIdempotencyKey`, `StoreSetting.pos_refund_otp_threshold` (200.00) / `pos_manager_code_hash` (migrations `0229_pos_api`, `billing/0013_seed_pos_feature`); legacy `products/views/staff_pos.py` calls the same service.
    - Bookings: `booking_service.py`, `api/views_bookings.py`; `ServiceAvailability` (0 = Monday, multiple windows, `is_active`), `BookingSlot` (partial unique on held/booked, `session_key`, `held_until`, `order`); hold 15 min (`BOOKING_HOLD_MINUTES`), 30-min candidate step, `StoreSetting.timezone`; no migration; legacy `available_slots_api`, `book_appointment`, `manage_service_availability`.
    - Tests: `test_channels_api.py` (10) + 8 legacy `test_social_channels_phase*`, `test_marketplaces_api.py` (9) + 5 legacy `test_marketplaces_phase*`, `test_dropshipping_api.py` (11), `test_pos_api.py` (17), `test_bookings_api.py` (9).
  - **Done when**: each sub-domain has its models, engine services and code mappings listed.
  - **Status**: written in official Step 50 (2026-10-29): `docs/architecture/data-model/13-channels-operations.md` (five sub-domains — inbox and channels, marketplaces, dropshipping, POS, bookings — each with models, engine services and code mappings; 4 ER diagrams, POS shift and booking slot state machines, inbound/outbound and push/pull flows, a worked pricing example, 29 invariants, test inventory: 56 API + 526 legacy tests; 17 discrepancy call-outs plus code findings not in the register). Written by Claude in this step; GLM had not produced it.

- [x] **DOC-494** — Write the data-model page for Domain 14 (app store, Sharwa AI, support)
  - **Source**: INT-040 (M30), INT-041 (M31), INT-042 (M32) · Domain 14
  - **Output**: `docs/architecture/data-model/14-apps-ai-support.md`
  - **Must document**:
    - App store: `apps_api_service.py`, `api/views_apps.py`; public `appstore.App` (+ `icon_name`, migration `appstore/0007`), `AppBillingOverride`; tenant `StoreAppInstallation`, `AppInstallationEvent`, `AppUsageLog` (+ `order` FK SET_NULL, migration `0233_app_store_api`, filled by `create_pending_usage_log(order=…)`), `AppTemplate`, `AppBillingCharge`; `app_marketplace_service` (install/activate silently refused while `suspended_by_platform`/deactivate), `template_service.TEMPLATE_REGISTRY` (six WhatsApp entries fixed ids 1–6, `required` vars, 1024-char limit, `render_template_safe`), `sharwaconnect_client`, `is_billed_for_client`; contract code `whatsapp_bot` ⇄ model `whatsapp`; event map `ORDER_CREATED → order_new …`.
    - Sharwa AI: `sharwa_ai_api_service.py`, `api/views_sharwa_ai.py` (wired before `apps/<str:code>/`); `services/sharwa_ai_client` gateway, random `ai_session_id` in public `WhatsAppSessionIndex`, `SupportBotSettings`, `wa_session_status`, `ai_connected_at`, `record_status` shared by poll and `sharwa_ai_session_status_webhook` (`tenants/webhooks_ai.py`), `services/sharwa_ai_sso.py`.
    - Support: `support_api_service.py`, `api/views_support.py`; `SupportSession` (+ `version`), `SupportMessage` (+ `sender_name`, `client_id` unique per session), `BotToolCallLog`, `SupportTicket` (+ `description`, `updated_at`, `created_by`, `customer_phone`; `closed_at` follows status) (migration `0234_support_api`); `support_lock_service` (`staff_takeover/release/send_reply`, `escalate_session`, new `staff_close`, all `select_for_update`); timeline merge ids `2×message_id` / `2×tool_call_id+1`, cursor `"<last message>.<last tool call>"`.
    - Legacy HTML kept: `views/apps.py` (hard-coded two-app catalogue), QR-pairing proxy, `views/sharwa_ai_hub.py`, `views/support_hub.py`, `views/operations.support_tickets_view`.
    - Tests: `test_apps_api.py` (7), `test_sharwa_ai_api.py` (6), `test_support_api.py` (6).
  - **Done when**: app lifecycle and support lock state machine are diagrammed.
  - **Status**: written in official Step 50 (2026-10-29): `docs/architecture/data-model/14-apps-ai-support.md` (app store, Sharwa AI and support models; app lifecycle and support-lock state machines, WhatsApp template and session flows, webhooks and signing, 19 API tests by name; 12 discrepancy call-outs plus ten code findings). Written by Claude in this step; GLM had not produced it.

- [x] **DOC-495** — Write the data-model page for Domain 15 (reports & analytics)
  - **Source**: INT-027 (M25) · Domain 15
  - **Output**: `docs/architecture/data-model/15-reports.md`
  - **Must document**:
    - Provider `api/views_reports.py` with `reports_contract.py`, `ReportExportJobSerializer`, `ScheduledReportSerializer`; 42 registry codes/categories/order; statuses (`ai_forecasting` = `coming_soon`, `whatsapp_costs` = `available`, 6 disabled rows).
    - `DailyStoreMetrics` + `compute_day_metrics(day, location_id)`; location dimension on `sales_overview`, `orders`, `store_overview`, `best_sellers` (`Order.source_location` or `OrderItem.source_location` for split orders via id subquery, no double counting), past days cached 1 h; `has_locations` + `locations`.
    - Exports `export_table` writes EVERY page (stopped at 1000 rows before); keeps `location` param; scheduled reports; `export_ready` notification.
    - Shared 5-min refresh cooldown with dashboard (INT-003); push stats card on `/dashboard/reports` (INT-016); public `TenantStatsSnapshot` for platform rollups; `operating_expenses` report (M33).
    - No migration. Tests: `api/test_reports_api.py` + `ReportsLocationFilterTests` (3); `scripts/reports-check.ts`.
  - **Done when**: the metrics pipeline (daily compute → report → export) is diagrammed.
  - **Status**: written in official Step 50 (2026-10-29): `docs/architecture/data-model/15-reports.md` (report registry and metrics models, daily compute → report → export pipeline diagrammed, scheduled reports; 2 discrepancies). Rescued from a partial GLM run; the code line corrected to the real file list.

- [x] **DOC-496** — Write the data-model page for Domain 16 (platform console)
  - **Source**: INT-030 (M20), INT-031 (M45), INT-032 (M46) · Domain 16
  - **Output**: `docs/architecture/data-model/16-platform-console.md`
  - **Must document**:
    - Providers: `tenants/console_service.py`, `tenants/console_money_service.py`, `tenants/console_billing_service.py`, all routed in `api/views_platform.py`; public schema only.
    - Models: `TenantStatsSnapshot`, `TenantDeactivationRecord` (+ `reinstated_at/actor/updated_at`), `PendingWebhookEvent` (+ `resolved_at`, `attempts`), `PlatformActionLog`, `TenantFeatureOverride` (+ `updated_at`) (migrations `tenants/0027_platform_console_api`, `billing/0012`); `SharwaPayTopupRequest.bank_name/claimed_phone/reviewed_by`, `SharwaPayWithdrawalRequest.reviewed_by` (migration `sharwapay/0003_console_review_fields`; backfill bank-webhook top-ups = «كريمي», claimed phone parsed from note «الرقم الوارد: X»; Kuraimi webhook stores both); `SharwaShipZone`; `Plan`, plan-feature cells (`update_or_create`), `Subscription`, `PlatformBillingSettings` (`stores_without_subscription`), `App` (+ `icon_name`), `AppBillingOverride` (one per app × store), market categories (reorder full id set; used → 409 «عطّلها بدل الحذف»).
    - Legacy: `tenants/admin.py` actions (re-provision, Sharwa Ship tasks, bulk feature manager), HTML `master-dashboard` + `master-dashboard/dues/` (8 POST actions), `sharwapay/admin.py` bulk actions, `billing/admin.py`.
    - Tests: `api/test_platform_console_api.py` (14, incl. real tenant-schema read and missing-schema store), `api/test_platform_money_api.py` (7, real wallet debits), `api/test_platform_billing_api.py` (7, real installation count).
  - **Done when**: each console resource maps to its model and legacy admin equivalent.
  - **Status**: written in official Step 50 (2026-10-29): `docs/architecture/data-model/16-platform-console.md` (19 entities on one ER diagram, console resource → model → legacy admin mapping, top-up approval sequence, 4 discrepancies). Rescued from a partial GLM run; an invalid Mermaid sequence fixed, Arabic quotes made verbatim, out-of-range line reference corrected.

### 3.7 Background jobs (Celery & Beat)

Every asynchronous job: trigger, schedule, retries, idempotency and failure handling, plus the worker operations runbook.

- [x] **DOC-497** — Write the Celery architecture page and the job register
  - **Source**: A.8 (full table)
  - **Output**: `docs/architecture/50-background-jobs.md`
  - **Must document**:
    - Worker + Beat roles; per-tenant dispatch pattern (Beat task iterates tenants, tasks run inside the tenant schema); `on_commit` enqueueing convention; tasks must never raise into the caller.
    - Register rows (one per job, kind task / Beat): `send_order_push`; `send_campaign` + Beat `dispatch_scheduled_campaigns` (5 min/tenant); `deliver_webhook` + Beat `dispatch-low-stock-webhooks` (15 min); `queue_provisioning` / `provision_tenant_schema` + sweeper; `process_carrier_webhook_event`; POS force-close; `dispatch_channel_message`, `sync_channel_catalog`, `sync_channel_product`, channel health; marketplace single/bulk push, `order_pull`, `fba_inventory`, `retry_failed_confirmation`; dropshipping self-chaining jobs + hourly catalog beat + `fetch_scheduled_feeds_for_tenant`; `dispatch_whatsapp_message`, `send_whatsapp_notification_async`, `order_events.notify_sharwaconnect_of_order_event`; `deliver_staff_reply`, `send_staff_reply_message`; `retry_pending_awb_issuance_for_tenant`; and the explicit "no Celery" case: CSV product import (200-row chunks on run/poll).
  - **Done when**: every job in A.8 has a row with trigger, queue, schedule, retry and idempotency.
  - **Status**: written in official Step 38 (2026-10-28): `docs/architecture/50-background-jobs.md` (Celery topology and conventions, register of 110 tasks (105 in `products/tasks/*`, 5 in `tenants/tasks.py`) and 26 Beat entries with trigger, queue, schedule, retry and idempotency; no-Celery cases; 14 discrepancies and extra jobs the roadmap omitted).

- [x] **DOC-498** — Document the order push job (`send_order_push`)
  - **Source**: INT-016 (M44) · A.8
  - **Output**: `docs/architecture/jobs/order-push.md`
  - **Must document**:
    - `products/services/order_push_service.py` + Celery `send_order_push`; targets active subscriptions with the order's phone (`clean_phone_number`), link `/track/<uuid>`, store name in title.
    - Hooks: `order_events.notify_sharwaconnect_of_order_event` (SHIPPED / DELIVERED / CANCELLED / PAYMENT_RECEIVED — not CREATED), accepted `apply_shipment_transition` (picked_up / in_transit / delivered / returned), `mark_fulfillment_prepared` for pickup orders (ready_for_pickup).
    - No subscribers ⇒ no task; on_commit; never raises; one push per (order, kind) per 6 h (cache).
    - Manual broadcast `push/test/` → 202 `{queued_for}` (owner only, 429 within 60 s); VAPID public key row.
  - **Done when**: trigger table and throttle key are documented.
  - **Status**: written in official Step 38 (2026-10-28): `docs/architecture/jobs/order-push.md` (`send_order_push` and `send_push_broadcast`, trigger table, 6 h throttle key; 2 discrepancies).

- [x] **DOC-499** — Document marketing campaign jobs (`send_campaign`, `dispatch_scheduled_campaigns`)
  - **Source**: INT-019 (M13) · A.8
  - **Output**: `docs/architecture/jobs/campaigns.md`
  - **Must document**:
    - `send_campaign` in chunks; status flipped to sent under a row lock first (no double send); `MarketingCampaign.sent_at`.
    - New Beat `dispatch_scheduled_campaigns` every 5 min per tenant — scheduled campaigns were never sent before INT-019.
    - Channel connectivity: WhatsApp/social = active app installation; SMS/e-mail have no real provider ⇒ not connected (400).
    - Abandoned-cart reminders via the scheduled command and manual «remind» sharing `_send_one_reminder` (template, channel, step-2 coupon).
  - **Done when**: the campaign state machine (draft → scheduled → sent, cancel via `PATCH {status:"draft"}`) and its jobs are diagrammed.
  - **Status**: written in official Step 38 (2026-10-28): `docs/architecture/jobs/campaigns.md` (campaign state machine and jobs (`dispatch_scheduled_campaigns`, `dispatch_broadcast_campaign_chunk`); `send_campaign` is a plain function; abandoned-cart command has no Beat entry; 2 discrepancies).

- [x] **DOC-500** — Document outgoing webhook delivery jobs
  - **Source**: INT-023 (M19) · A.8
  - **Output**: `docs/architecture/jobs/webhooks.md`
  - **Must document**:
    - `deliver_webhook`: 3 attempts (now, +60 s, +300 s); auto-disable after 10 consecutive failures; re-enable resets the counter; redeliver = new attempt for failed rows only; synchronous test event.
    - Signature `X-Sharwa-Signature: t=<ts>,v1=HMAC-SHA256(secret, "<ts>.<body>")` + `X-Sharwa-Event` / `X-Sharwa-Delivery`; SSRF re-check at send.
    - Event sources: `order.created` / `order.status_changed` (order_events), `order.fulfillment_changed` (`Order.set_fulfillment_status`), `order.refunded` (refund_service), `shipment.event` (accepted transitions), `product.updated` (change log, stock-only excluded), `inventory.low_stock` via Beat `dispatch-low-stock-webhooks` every 15 min (once per entry into the low range, because stock moves via `F()` never hit `save()`).
    - Delivery log `WebhookDelivery` with status/event/date filters.
  - **Done when**: each event's emitter and the retry timeline are documented.
  - **Status**: written in official Step 38 (2026-10-28): `docs/architecture/jobs/webhooks.md` (`deliver_webhook` retry timeline, signature, event emitters, low-stock Beat; delivery-log lifecycle).

- [x] **DOC-501** — Document provisioning and carrier-webhook jobs
  - **Source**: INT-030 (M20), INT-002, INT-004 · A.8
  - **Output**: `docs/architecture/jobs/provisioning-and-carrier-webhooks.md`
  - **Must document**:
    - `queue_provisioning` / `provision_tenant_schema`; re-provision = set `pending` + queue; sweeper thresholds pending > 5 min / provisioning > 20 min (`stalled`).
    - `process_carrier_webhook_event`, run synchronously on console retry with the same idempotency key `products.tasks.shipping.carrier_idempotency_key` (also used by `CarrierWebhookView`); failure bumps `attempts`, event stays pending; `PendingWebhookEvent.resolved_at`; discard; DLQ counts on console overview; DLQ source filter includes `sharwa_ship`.
    - Sharwa Ship enable/disable tasks from the console (10-min marker; refused up front when feature off).
  - **Done when**: the DLQ retry/discard procedure is linked from the runbooks.
  - **Status**: written in official Step 38 (2026-10-28): `docs/architecture/jobs/provisioning-and-carrier-webhooks.md` (provisioning state diagram, sweeper, carrier-webhook DLQ retry/discard as numbered steps (§4.4), Sharwa Ship tasks; 2 discrepancies).

- [x] **DOC-502** — Document POS, support and AWB jobs
  - **Source**: INT-033 (M16), INT-042 (M32), INT-047 (M39) · A.8
  - **Output**: `docs/architecture/jobs/pos-support-awb.md`
  - **Must document**:
    - POS force-close task: bumps `Shift.version`, raises `force_close_notice_seen` (cleared when cashier opens a new shift).
    - `deliver_staff_reply` (new): staff reply written synchronously under the lock, gateway send queued on commit; `send_staff_reply_message` shares the delivery helper.
    - `retry_pending_awb_issuance_for_tenant` queued on commit by `awb-queue/<id>/retry/` (failed only, 409 otherwise); `PendingAWBQueue`; `awb_failed` notification.
  - **Done when**: each job lists its trigger endpoint and state fields it changes.
  - **Status**: written in official Step 38 (2026-10-28): `docs/architecture/jobs/pos-support-awb.md` (POS force-close, staff-reply tasks, AWB retry with state fields and trigger endpoints; 3 discrepancies).

- [x] **DOC-503** — Document channel (inbox & social) jobs
  - **Source**: INT-037 (M27) · A.8
  - **Output**: `docs/architecture/jobs/channels.md`
  - **Must document**:
    - `dispatch_channel_message(message_id=…)` updates the queued `Message` row (`sent` + external id, or `failed` + provider reason in `error_detail`, e.g. Meta 24 h window) instead of adding a «bot» row; same `AppUsageLog`; channel's own queue.
    - `sync_channel_catalog` (run 409 when not connected/unhealthy, `last_run_at`), new `sync_channel_product` (per-product resync), channel health task (`connection_health='unhealthy'`).
    - Inbound path `process_inbound_channel_message` via public bridge index; new inbound reopens resolved/pending conversations.
  - **Done when**: outbound message status lifecycle (queued → sent/failed) is diagrammed.
  - **Status**: written in official Step 38 (2026-10-28): `docs/architecture/jobs/channels.md` (outbound message lifecycle queued → sent/failed, catalog/product sync, health tasks, inbound path; 2 discrepancies and a queued-forever gap).

- [x] **DOC-504** — Document marketplace jobs
  - **Source**: INT-038 (M28) · A.8
  - **Output**: `docs/architecture/jobs/marketplaces.md`
  - **Must document**:
    - Single push (one task per listing on the job) vs bulk Feeds job above 20 listings on Amazon (409 while one runs); `NO-ID` errors recorded in the same job.
    - `order_pull`, `fba_inventory` (one live job per market, 409 when live; FBA only where adapter supports it).
    - `retry_failed_confirmation` (shipment confirmation automatic on tracking entry).
    - `MarketplaceSyncJob` counters, `triggered_by`, summary, errors CSV; `sync_failed` notifications.
  - **Done when**: each job type lists start endpoint, concurrency rule and error output.
  - **Status**: written in official Step 38 (2026-10-28): `docs/architecture/jobs/marketplaces.md` (5 job types with start endpoint, concurrency rule and error output; 3 Beat entries; 3 clarifications).

- [x] **DOC-505** — Document dropshipping jobs and schedules
  - **Source**: INT-039 (M29) · A.8
  - **Output**: `docs/architecture/jobs/dropshipping.md`
  - **Must document**:
    - Self-chaining jobs `catalog_pull` (products), `price_sync` (prices), `inventory_sync` (inventory), `product_import` (import), `feed_import` (feed); `order_*` job types never created.
    - Hourly catalog beat honouring `SupplierConnection.catalog_sync_interval_min` (replaced fixed 6 h) and now periodic re-pricing by `price_sync_interval_min` / `last_price_sync_at` (first pass sets baseline only).
    - `fetch_scheduled_feeds_for_tenant` honouring `FeedMapping.schedule_interval_min` with 5-minute slack (link feeds only).
    - Retry semantics per type (failed import rows + fetch failures, whole batch after auth failure, feed re-run, inventory/catalog/reprice); `sync-inventory/` 202; pricing rule apply = `price_sync` job on affected products.
  - **Done when**: every job type and beat has schedule and retry documented.
  - **Status**: written in official Step 38 (2026-10-28): `docs/architecture/jobs/dropshipping.md` (5 live job types, self-chaining map, 6 Beat entries and retry semantics; `order_*` types verified never created; 2 clarifications).

- [x] **DOC-506** — Document WhatsApp / SharwaConnect messaging jobs
  - **Source**: INT-040 (M30) · A.8
  - **Output**: `docs/architecture/jobs/whatsapp.md`
  - **Must document**:
    - `dispatch_whatsapp_message`, `send_whatsapp_notification_async`, `order_events.notify_sharwaconnect_of_order_event`; `create_pending_usage_log(order=…)` linking `AppUsageLog.order`; gated by `is_app_active('whatsapp')`.
    - Event map `ORDER_CREATED → order_new`, `ORDER_SHIPPED → order_shipping_update`, `ORDER_DELIVERED → order_delivered`, `ORDER_CANCELLED → order_cancelled`, `PAYMENT_RECEIVED → payment_confirmed` (legacy free keys pass through, unknown → manual).
    - Public webhook `tenants/webhooks.py` for SharwaConnect callbacks.
  - **Done when**: an order event can be traced to a usage log row.
  - **Status**: written in official Step 38 (2026-10-28): `docs/architecture/jobs/whatsapp.md` (order-event hook to usage-log trace, event map, SharwaConnect callback; 2 discrepancies (two tasks have no live caller)).

- [x] **DOC-507** — Write the runbook: operating Celery workers and Beat
  - **Source**: A.8 · A.10
  - **Output**: `docs/ops/runbooks/celery.md`
  - **Must document**:
    - Required processes: worker(s) consuming all queues (incl. channel queues), single Beat instance; broker/result backend; how to check Beat schedules (`dispatch_scheduled_campaigns`, `dispatch-low-stock-webhooks`, dropshipping hourly beat, `fetch_scheduled_feeds_for_tenant`, provisioning sweeper).
    - Symptoms when Beat is down (scheduled campaigns not sent, no low-stock webhooks, no feed refresh, stalled stores) and when workers are down (pushes, webhooks, channel replies stuck `queued`, AWB retries, provisioning `pending`).
    - Safe restarts, inspecting failed tasks, re-queuing via console DLQ / AWB queue / webhook redeliver / job retry endpoints.
  - **Done when**: an operator can diagnose each "stuck" symptom from this page.
  - **Status**: written in official Step 38 (2026-10-28): `docs/ops/runbooks/celery.md` (processes and queues, Beat checks, Beat-down and workers-down symptom tables, safe restarts, re-queue routes; not dry-run (DOC-532)).

### 3.8 Migrations ledger

Every schema change of Phase 002 with deployment order, backfills and the multi-tenant apply procedure.

- [x] **DOC-508** — Publish the Phase 002 migrations ledger
  - **Source**: A.9 (full table)
  - **Output**: `docs/ops/migrations/phase-002-ledger.md`
  - **Must document**:
    - Every row: `products/0211`–`0215` (INT-005 Products Phase A); `0216_notifications` (`Notification`, `NotificationRead`); `0217_storesetting_fx_rate_precision` (FX 4 decimals); `0218_customer_crm` (`CustomerNote`; `CustomerReliabilityRecord.cod_status_reason/updated_at/updated_by`; `ProductReview.customer_phone`); `0219_theme_version_section_label` (`StoreSetting.theme_version` + `theme_updated_at`; `StoreSection.label`); `0220_marketing_api` (`MarketingCampaign.sent_at`; `PromotionalOffer.buy_condition_type` + `all`/`min_items`); `0221_merchant_wallet_api` (`MerchantWalletTransaction.kind` + `reference_kind/reference_id` backfilled; `MerchantWithdrawalRequest.payout_account` + `idempotency_key`); `0222_shipping_api` (`Order.delivery_latitude/longitude` + `zone_review_resolved_at`; `RestrictedZonePolygon.reason`; `DeliverySLARule.delivery_method` + optional `source_location`); `0223_staff_api` (`StaffSession.device_label`; `PersonalAccessToken.name/last_used_at`; `TrustedDevice.staff/last_seen_at`; `RosterSchedule.location` nullable; `BehaviorAlert.value/limit`); `tenants/0026_customdomain`; `0224_webhooks` (`WebhookEndpoint`, `WebhookDelivery`); `0225_inventory_api` (`StockMovement.actor/quantity_after/reference_type/reference_id`; `InventoryItem.location/order`; `ApprovalRequest.payload` + nullable `location`); `0226_locations_api` (`Location.external_refs`; `LockerDetails.provider_name/locker_code`; `VehicleDetails.driver_phone`); `0227_wallets_api` (`WalletTransaction.actor` + unique `idempotency_key`; `CustomerPointsTransaction.wallet_transaction`); `0228_engagement_api` (`StoreReview.rating` nullable; `ProductReview.is_approved`); `tenants/0027_platform_console_api` (`TenantDeactivationRecord.reinstated_at/actor/updated_at`; `PendingWebhookEvent.resolved_at`; `PlatformActionLog`); `billing/0012_tenantfeatureoverride_updated_at`; `sharwapay/0003_console_review_fields`; `appstore/0007_app_icon_name`; `0229_pos_api` (Shift/ShiftCashMovement nullable actors, `Shift.version/approval/force_close_notice_seen`, `ShiftCashMovement.note`, `PosReceipt`, `PosIdempotencyKey`, `StoreSetting.pos_refund_otp_threshold/pos_manager_code_hash`); `billing/0013_seed_pos_feature`; `0230_procurement_api`; `0231_inbox_api`; `0232_dropshipping_api`; `0233_app_store_api`; `0234_support_api`; `0235_seed_expenses_permission`; `0236_advanced_products_api`.
    - Shared (public) vs tenant apps per migration (`tenants`, `billing`, `sharwapay`, `appstore` → public; `products` → every tenant schema).
    - "No migration" list: INT-001 → INT-004, INT-006 → INT-008, INT-011 → INT-016 (none stated for 011–014; 015 and 016 explicit), INT-026, INT-027, INT-034, INT-036, INT-038, INT-041, INT-044, INT-046 → INT-049 (INT-048 changed `apply_credit_if_approved` logic only).
    - Totals: 28 migrations.
  - **Done when**: the ledger matches `showmigrations` output on a fresh database.
  - **Status**: written in official Step 39 (2026-10-28): `docs/ops/migrations/phase-002-ledger.md` (224 lines; every Phase 002 migration with app, schema placement, what it changes and the INT task; the "no migration" list; 2 diagrams; 2 discrepancies: 32 migration files, not 28, and INT-006 has three migrations). **Acceptance check not run**: no database was available, so the ledger was built from the migration files and has not been compared with `showmigrations` on a fresh database.

- [x] **DOC-509** — Document data backfills and legacy-data derivations
  - **Source**: A.9 · INT-020, INT-024, INT-026, INT-029, INT-031, INT-033, INT-035, INT-022, INT-045
  - **Output**: `docs/ops/migrations/backfills.md`
  - **Must document**:
    - `0221`: `MerchantWalletTransaction.kind`/references backfilled from the fixed description wording.
    - `0225`: legacy `StockMovement` rows — reference parsed from note «طلب #N» / «أمر شراء #N», balance derived backwards from current stock; `InventoryItem.order` falls back to `meta.order_id`.
    - `0228`: `ProductReview.is_approved` default True keeps legacy reviews visible; `StoreReview.rating` nullable (legacy star-less comments excluded from averages).
    - `sharwapay/0003`: every bank-webhook top-up = «كريمي»; claimed phone parsed from note «الرقم الوارد: X»; `reviewed_by` backfill.
    - `0229`: old shifts marked `force_close_notice_seen`; NULL `opened_by`/`created_by` = owner.
    - `0230`: `PurchaseOrder.updated_at` backfilled from `created_at`; PO number derived `PO-0001`.
    - `0223`: legacy `BehaviorAlert` value/limit parsed from `detail`.
    - `0235`: seed pattern same as `0210`; `billing/0013` seeds `Feature(pos, requires_plan=True)`.
    - Derived (non-migrated) legacy data: pre-INT-026 return timelines from timestamps; legacy POs get derived «created»; ProductTemplate blueprint to JSON one-time migration (INT-005 decision); main images migrated into gallery.
    - Management command `normalize_media_filenames` (renames Arabic-named files, rewrites FileField rows).
  - **Done when**: every backfill has its source rule and a verification query.
  - **Status**: written in official Step 39 (2026-10-28): `docs/ops/migrations/backfills.md` (455 lines; each backfill with its source rule, the migration file and a verification query; derived legacy data; `normalize_media_filenames`; 2 diagrams; 6 discrepancies, e.g. `0225` and `0223` contain no data migration and `reviewed_by` is not backfilled). The verification queries were written from the code and not run.

- [x] **DOC-510** — Write the runbook: applying migrations across tenant schemas
  - **Source**: A.9 · A.10
  - **Output**: `docs/ops/runbooks/migrations.md`
  - **Must document**:
    - django-tenants procedure: `migrate_schemas --shared` (public: `tenants`, `billing`, `sharwapay`, `appstore`), then `migrate_schemas` for every tenant schema; order relative to code deploy; backups first; long backfills; failure on one schema (resume, savepoint behaviour of console reads with a broken schema).
    - Post-migration checks: permission seed present (`expenses.manage`), `pos` feature seeded, notifications table present per tenant.
    - Fares runs migrations himself when Claude cannot (process note).
  - **Done when**: the runbook was executed once on staging and timings recorded.
  - **Status**: written in official Step 39 (2026-10-28): `docs/ops/runbooks/migrations.md` (387 lines; `migrate_schemas --shared`, then every tenant schema, order against the code deploy, backups, post-migration checks, rollback; 1 diagram; 1 discrepancy: two console reads are not wrapped in a savepoint). **Acceptance check not run**: the runbook was not executed on staging and no timings are recorded.

### 3.9 Environment, dependencies & management commands

- [x] **DOC-511** — Write the environment variable reference
  - **Source**: A.10 · A.3 · INT-023, INT-038, INT-041
  - **Output**: `docs/ops/environment.md`
  - **Must document**:
    - Next.js: `SHARWA_MOCKS` (`on|off`, default on outside production), `SHARWA_LIVE_MODULES` (comma list of A.3 keys, `*` = all, `none` for mock E2E), `NEXT_PUBLIC_USE_MOCKS` (project protocol) and the Django base URL used by `upstream.ts`.
    - Django: `SHARWA_EDGE_IP`, `SHARWA_EDGE_CNAME` (custom domains), `SHARWA_AI_MAX_CONSECUTIVE_BOT_REPLIES` (default 4), `SHARWA_AI_CONSOLE_URL` + SSO keys (503 when missing), `NOON_MARKETPLACE_ADAPTER` (fake noon adapter), `DATA_UPLOAD_MAX_MEMORY_SIZE` = 8 MB, `CSRF_COOKIE_HTTPONLY=True`, DEBUG-only behaviours.
    - Per-environment matrix (dev Windows, staging, production) and required vs optional.
  - **Done when**: every variable referenced in the inventory has default, effect and failure mode.
  - **Status**: written in official Step 09 (2026-10-27): `docs/ops/environment.md` §2–§7 — every Next.js variable (`src/env.ts`), every Django variable grouped by area with default, effect and failure mode (`config/settings.py`, `deploy/`), the per-environment matrix, what stops a process at start and the `DEBUG`-only behaviours; §1 is DOC-461 from Step 07. `NEXT_PUBLIC_USE_MOCKS` does not exist in the code (call-out on the page). The Django `.env` was never read.

- [x] **DOC-512** — Document dependencies and external services
  - **Source**: A.10 · INT-023, INT-037, INT-038, INT-039, INT-040, INT-041, INT-014
  - **Output**: `docs/ops/dependencies.md`
  - **Must document**:
    - Python dep `dnspython` (domain verification; 503 if unavailable); Pillow (Sharwa Pay receipt real-image check).
    - External services: WhatsApp/SharwaConnect gateway, Sharwa AI gateway + console, Meta / TikTok / Telegram APIs, Amazon SP-API, noon, CJ (real) / مخازن / قنوات (fake adapters), payment gateways jeeb & kuraimi (+ Kuraimi webhook), carriers aramex & smsa, Web Push (VAPID), Google Fonts (`GOOGLE_FONT_CHOICES`), tracking pixels GTM/Meta/TikTok/Snap/gtag.
  - **Done when**: each external dependency has owner, credential location and outage behaviour.
  - **Status**: written in official Step 09 (2026-10-27): `docs/ops/dependencies.md` — runtime platform, Python and frontend packages, 20 external services with credential location and outage behaviour, failure modes. The *owner* of Green API, DeepSeek and the Meta / TikTok / Amazon platform apps is marked «confirm» on the page for fares.

- [x] **DOC-513** — Document management commands and debug-only codes
  - **Source**: A.10 · INT-033, INT-020
  - **Output**: `docs/ops/management-commands.md`
  - **Must document**:
    - `manage.py set_pos_manager_code --schema=… <code>` (stores hash in `StoreSetting.pos_manager_code_hash`).
    - DEBUG: `2468` works as POS manager code while none is set; `123456` as POS refund OTP — never in production.
    - `normalize_media_filenames` (management step after INT-020 media fix).
    - `sharwa.bat` sets a UTF-8 console on Windows.
    - Abandoned-cart scheduled reminder command (shares `_send_one_reminder`).
  - **Done when**: each command has usage, schema scope and safety notes.
  - **Status**: written in official Step 09 (2026-10-27): `docs/ops/management-commands.md` — the 17 custom commands (usage, schema scope, safety, production-safe or not, what schedules it), the `set_pos_manager_code` rules and messages, `normalize_media_filenames`, `sharwa.bat`, and the debug-only codes `123456` (store sign-up OTP **and** POS refund OTP) and `2468`. `send_abandoned_cart_reminders` and `release_stuck_orders` have no Beat or cron entry in the repository.

- [x] **DOC-514** — Document upload size limits end to end
  - **Source**: A.10 · INT-005 decision, INT-018, INT-045, INT-048, INT-039
  - **Output**: `docs/ops/upload-limits.md`
  - **Must document**:
    - `DATA_UPLOAD_MAX_MEMORY_SIZE` = 8 MB bounds BFF buffering and multipart publishes; production Nginx `client_max_body_size 8M` must match.
    - Per-feature limits: section item images ≤ 5 MB data URLs (jpg/png/webp/gif); Sharwa Pay receipts ≤ 5 MB jpg/jpeg/png/webp/gif + real image; checkout receipts JPEG/PNG only; CSV import ≤ 20,000 rows; a publish with many new slider images in one PATCH is bounded by 8 MB.
  - **Done when**: a single table lists every upload surface and its limits.
  - **Status**: written in official Step 09 (2026-10-27): `docs/ops/upload-limits.md` — the four-layer ladder and one table of every upload surface. Roadmap says Nginx `client_max_body_size 8M` must match Django / code does `55m` (`deploy/nginx/snippets/sharwa-proxy.conf`); documented as it behaves. Legacy HTML import and the platform Sharwa Pay top-up view have no reviewed limit.

### 3.10 Deployment procedures

- [x] **DOC-515** — Document the production topology
  - **Source**: A.10, A.11 · INT-023 · decisions
  - **Output**: `docs/ops/deployment/topology.md`
  - **Must document**:
    - Nginx (wildcard store subdomains, custom domains, `console.<base>` public origin, platform origin for Sharwa Pay, `client_max_body_size 8M`), Next.js server, Django app server (gunicorn/uvicorn), Celery worker(s) + one Beat, Redis/cache (OTP HMACs, throttles, cooldowns, markers), PostgreSQL with schemas, media storage and serving.
    - Origins: store hosts, platform origin, console host; which APIs are public-schema-only.
  - **Done when**: a topology diagram and port/host table exist.
  - **Status**: written in official Step 39 (2026-10-28): `docs/ops/deployment/topology.md` (254 lines; component, port and host tables, 2 diagrams; 3 discrepancies: Gunicorn sync workers, `client_max_body_size 55m`, one Nginx server pair proxying everything to Gunicorn).

- [x] **DOC-516** — Write the runbook: TLS issuance for custom domains
  - **Source**: INT-023 · A.10 (`deploy/README`)
  - **Output**: `docs/ops/runbooks/custom-domain-tls.md` (and align `deploy/README`)
  - **Must document**:
    - When a domain reaches `verifying` (TXT + routing OK, `tenants.Domain` created) the ops step issues TLS; `active` once HTTPS answers; renewal; failure handling; edge IP/CNAME values.
  - **Done when**: a new custom domain can be taken to `active` following only this runbook.
  - **Status**: written in official Step 39 (2026-10-28): `docs/ops/runbooks/custom-domain-tls.md` (260 lines; domain states, DNS, TLS issuance, the CSRF and `ALLOWED_HOSTS` step, verify and roll back; 2 discrepancies: no hand-off from `verifying` to operations, and per-domain CSRF/hosts entries are needed). Not exercised against a real domain, so the "taken to `active`" check is untested.

- [x] **DOC-517** — Write the go-live checklist (switching `SHARWA_MOCKS=off`)
  - **Source**: A.3, A.9, A.8, A.10, A.13 · Part C checkpoints
  - **Output**: `docs/ops/deployment/go-live-checklist.md`
  - **Must document**:
    - All migrations applied (shared + tenants); Celery + Beat running; env vars set (edge, AI console/SSO, VAPID, gateways); DEBUG off (no 2468/123456 codes); POS manager codes set per store; plan settings (default free plan active before enabling plans); feature catalog reviewed; `.env.example` parity; mock-only hooks unreachable in production (`__reset`, `inbox/_mock/*`, `_test/bump`).
    - Verification by US1–US5 checkpoints.
  - **Done when**: the checklist is signed off on staging.
  - **Status**: written in official Step 39 (2026-10-28): `docs/ops/deployment/go-live-checklist.md` (341 lines; gates G1 → G17 with command, expected result and sign-off table; the US1 → US5 checkpoints; 4 discrepancies, e.g. the debug OTP `123456` is also accepted in merchant password reset and `SHARWA_MOCKS=off` is the only guard for the mock-only hooks). **Not signed off on staging**: every result column is "not run" by design.

- [x] **DOC-518** — Write the rollback procedure
  - **Source**: A.3 · A.9
  - **Output**: `docs/ops/deployment/rollback.md`
  - **Must document**:
    - Code rollback vs per-module switch-off (remove key from `SHARWA_LIVE_MODULES`); Django-first rows keep hitting Django; migrations forward-only guidance; data written live is not visible in mock mode.
  - **Done when**: rollback options are ranked by blast radius.
  - **Status**: written in official Step 39 (2026-10-28): `docs/ops/deployment/rollback.md` (164 lines; rollback options ranked by blast radius with commands taken from `deploy/` and the code; 1 discrepancy: per-module switch-off does nothing while `SHARWA_MOCKS=off`). No option was executed.

- [x] **DOC-519** — Write the Windows development environment guide
  - **Source**: A.11 · INT-020 · A.2 mock runtime
  - **Output**: `docs/ops/dev-setup-windows.md`
  - **Must document**:
    - Repos at `C:\sharwa_front\sharwa-frontend` and `C:\sharwa_saas`; `sharwa.bat` UTF-8 console; `set SHARWA_LIVE_MODULES=none&& npm run dev` syntax.
    - Local media: `DevMediaMiddleware` resolves double-encoded paths, NFC/NFD and case variants of Arabic names, logs misses ASCII-safe; `urls_public` serves `MEDIA_URL` under DEBUG; `tenant_upload_path` stores non-ASCII uploads under a uuid name; `normalize_media_filenames`.
    - Running Django, Celery, Next together; hosts entries for store subdomains.
  - **Done when**: a fresh Windows machine reaches a working live store following the guide.
  - **Status**: written in official Step 39 (2026-10-28): `docs/ops/dev-setup-windows.md` (374 lines; prerequisites, backend and frontend set-up, `sharwa.bat`, dev media, 1 diagram; 1 discrepancy: `DevMediaMiddleware` compares the final file name after NFC + `casefold()`). **Acceptance check not run**: no fresh Windows machine was used.

### 3.11 Testing & QA

- [ ] **DOC-520** — Publish the Django test-suite register
  - **Source**: A.12
  - **Output**: `docs/ops/testing/django-suites.md`
  - **Must document**:
    - Every suite with task and count: `api/test_public_api.py` (001) · `test_tenant_guard_api.py` (002) · `test_dashboard_api.py` (003) · `test_onboarding_api.py` (004) · `test_products_api.py` (005) · `test_catalog_api.py`, `test_catalog_serializers.py` (006) · `test_orders_api.py` (007) · `test_search_api.py` (008) · `test_notifications_api.py` (009) · `test_settings_api.py` (010) · `test_storefront_catalog_api.py` (011) · `test_storefront_product_api.py` (012) · `test_storefront_cart_api.py` (013) · `test_storefront_checkout_api.py` (014) · `test_order_tracking_api.py` (015) · `test_pwa_push_api.py` (016) · `test_customers_api.py` (017) · `test_design_api.py` (018) · `test_marketing_api.py` (019) · `test_payments_api.py` (020) · `test_shipping_api.py` (021, 9) · `test_staff_api.py` (022, 9; 101 incl. legacy) · `test_integrations_api.py` (023, 21) · `test_inventory_api.py` (024, 9) · `test_locations_api.py` (025, 8) · `test_returns_api.py` (026, 8) · `test_reports_api.py` + `ReportsLocationFilterTests` (027, 3) · `test_wallets_api.py` (028, 5) · `test_engagement_api.py` (029, 4) · `test_platform_console_api.py` (030, 14) · `test_platform_money_api.py` (031, 7) · `test_platform_billing_api.py` (032, 7) · `test_pos_api.py` (033, 17) · `test_partners_api.py` (034, 8) · `test_procurement_api.py` (035, 9) · `test_bookings_api.py` (036, 9) · `test_channels_api.py` (037, 10) · `test_marketplaces_api.py` (038, 9) · `test_dropshipping_api.py` (039, 11) · `test_apps_api.py` (040, 7) · `test_sharwa_ai_api.py` (041, 6) · `test_support_api.py` (042, 6) · `test_expenses_api.py` (043, 8) · `test_b2b_api.py` (044, 8) · `test_product_extras_api.py` (045, 10) · `test_courier_api.py` (046, 6) · `test_sharwa_ship_api.py` (047, 7) · `test_sharwa_pay_api.py` (048, 9) · `test_rollup_api.py` (049, 4).
    - Legacy suites re-run/updated: `products/test_push_notifications.py`, `test_pwa_install_tracking.py`, `api/tests.py`, `products/test_returns_b2b_api.py`, `products.test_social_channels_phase*` (8), `products.test_marketplaces_phase*` (5), three legacy supplier suites, `products/test_cod_collection.py`, auth/notifications/dashboard/customers/orders/suppliers/staff legacy suites, carrier/zone/orders/checkout/settings/tracking suites, `test_social_channels_phase2` pinning Meta mapping rule.
    - Special-purpose tests needing real tenant schemas (console suites).
  - **Done when**: the register matches `manage.py test --list` / discovery output.
  - **Status**: register written in official Step 09 (2026-10-27): `docs/ops/testing/django-suites.md` — 160 files, 1,814 test methods counted statically (INT-001 → 049 = 521). **Left open**: Done-when needs the register to match real discovery output; Django has no `--list` and no Python run was possible, so the page carries a suggested `DiscoverRunner.build_suite()` count command marked untested. Roadmap counts differ from the static count for 025, 027, 046 and 047, and the staff «101» could not be reproduced.

- [x] **DOC-521** — Document the frontend QA gates and mock E2E scripts
  - **Source**: A.1 Step 4 · A.12 · A.2
  - **Output**: `docs/ops/testing/frontend-qa.md`
  - **Must document**:
    - `npm run lint`, `npx tsc --noEmit` mandatory; per-module `scripts/<module>-check.ts` run with `SHARWA_LIVE_MODULES=none`.
    - Scripts touched during integration: `scripts/admin-stores-check.ts`, `reports-check.ts`, `marketplaces-check.ts`, `dropshipping-check.ts`, `expenses-check.ts` (per-run `RUN` tag for idempotent re-runs), `b2b-check.ts` (`requireMocks()`), `bundles-check.ts` (Playwright `caret: "initial"` to avoid hydration warning from inline `caret-color`), `sharwa-ship-check.ts`, `sharwa-pay-check.ts`, `rollup-check.ts`, plus the other per-module scripts.
    - Live-run procedure per module (switch on, smoke, verify no `x-sharwa-mock`).
  - **Done when**: each script lists its preconditions, fixtures and expected outputs.
  - **Status**: written in official Step 09 (2026-10-27): `docs/ops/testing/frontend-qa.md` — the five commit gates, the contract and doc checks, the common contract of the browser scripts and a table of all 49 scripts (40 module scripts + 9 static or tool scripts) with stores, sessions, state and screenshots. Scripts were read, not run. Roadmap says `expenses-check.ts` has a per-run `RUN` tag / code has none (it is in `marketing-check.ts`).

- [x] **DOC-522** — Propose and document a CI pipeline
  - **Source**: A.12 · A.1 Step 4
  - **Output**: `docs/ops/testing/ci.md`
  - **Must document**:
    - Jobs: frontend lint + typecheck + mock E2E (headless Playwright, `SHARWA_LIVE_MODULES=none`); Django `migrate_schemas` on a fresh Postgres + full test run incl. tenant-schema tests; contract check (Zod vs live responses) recommendation; `.env.example` key parity check (A.13).
    - Git process note: Claude never commits/pushes; fares runs `git add/commit/push`.
  - **Done when**: the CI proposal is accepted or recorded as a decision.
  - **Status**: proposal written in official Step 09 (2026-10-27): `docs/ops/testing/ci.md` — the existing backend `ci.yml` (3 jobs; the test job is red by design because of 15 known failures), the absent frontend pipeline, a proposed `frontend-static` job, a mock-E2E job, a live-contract job, an `.env.example` parity step and a draft workflow (untested). **Left open**: Done-when needs the proposal accepted or a decision recorded; fares has not decided (options A / B / C in §8 of the page). **Closed in official Step 52 (2026-10-30)**: fares chose **option A** — `frontend-static` (+ the env-parity step and the three `docs/_tools` checks) and the §5 backend changes now, mock E2E later; recorded in `docs/ops/testing/ci.md` §8. The workflow file itself is a later code change.

### 3.12 Cross-cutting infrastructure fixes & shared libraries

- [x] **DOC-523** — Document the shared Arabic normalization library
  - **Source**: A.11 · INT-008, INT-011, INT-024, INT-025, INT-017, INT-028
  - **Output**: `docs/architecture/60-arabic-normalization.md`
  - **Must document**:
    - `src/lib/i18n/normalize.ts` ↔ Python port (same rules and code-point ranges) ↔ PostgreSQL `lower(translate(…))` for columns; FR-48.05; no index.
    - Consumers: search (INT-008 first), storefront catalog search name/name_en (+ description), inventory `q`, locations `q`, customers/wallets name search.
  - **Done when**: the rules table is identical across the three implementations with a test reference.
  - **Status**: written in official Step 39 (2026-10-28): `docs/architecture/60-arabic-normalization.md` (221 lines; the rules table for the TypeScript, Python and PostgreSQL implementations, the modules that use each, tests; 1 diagram; 4 discrepancies, e.g. the SQL expression does not fold digits or whitespace and only the palette and storefront searches use it).

- [x] **DOC-524** — Document phone normalization rules
  - **Source**: A.11 · INT-003, INT-016, INT-017, INT-022, INT-028, INT-030, INT-031, INT-034, INT-048
  - **Output**: `docs/architecture/61-phone-normalization.md`
  - **Must document**:
    - `clean_phone_number`; `customer_key` (+ `966` for 9-digit Saudi mobiles, Arabic digits) for CRM and staff; staff login matching 967…/0…/local forms; Sharwa Pay mirrors frontend `normalizePhone` (local Yemeni → 967…, 966/967 kept); affiliate phone `^(967|966)\d{9}$`; console search `0777…` local form; payout duplicate numbers ignore spaces/dashes and Arabic digits.
  - **Done when**: every normalizer has examples and the modules using it.
  - **Status**: written in official Step 39 (2026-10-28): `docs/architecture/61-phone-normalization.md` (505 lines; every backend and frontend normalizer with examples and the modules that use it; 2 diagrams; 5 discrepancies: twenty backend and four frontend entries with different rules, Saudi numbers are accepted in some modules and refused in others).

- [x] **DOC-525** — Document remaining cross-cutting fixes (headers, CSRF bootstrap, savepoints, local media)
  - **Source**: A.11
  - **Output**: `docs/architecture/62-infra-fixes.md`
  - **Must document**:
    - Request body buffering (link to BFF page).
    - Local media on Windows (`DevMediaMiddleware`, `urls_public` MEDIA under DEBUG, `tenant_upload_path` uuid names).
    - Forwarded headers: `x-export-rows` added (INT-017).
    - CSRF bootstrap in `(admin)` layout; `getAdminSession()` reads Django `auth/me/` when live (INT-030).
    - Savepoints around every console tenant read; `UNION ALL` counts with per-schema fallback (INT-031, INT-032).
    - Shared Arabic and phone normalization (links).
  - **Done when**: every A.11 bullet has a section with cause, fix and file paths.
  - **Status**: written in official Step 39 (2026-10-28): `docs/architecture/62-infra-fixes.md` (272 lines; each A.11 fix with cause, fix, file paths and how to check; 3 diagrams; 4 discrepancies: `DevMediaMiddleware` case folding, `X-Export-Rows` also set by inventory export, the console session endpoint path, two console reads without a savepoint).

### 3.13 Known open items, legacy-only features & inconsistencies

A tracked register so documentation never presents unfinished behaviour as available.

- [x] **DOC-526** — Publish the open-items register (not built / Django rule kept)
  - **Source**: A.13 · INT-014, INT-015, INT-017, INT-021, INT-022, INT-037, INT-044, INT-045
  - **Output**: `docs/architecture/90-open-items.md`
  - **Must document**:
    - IP allow-list addresses for `enforce_ip_whitelist` — no model; toggle and warning unchanged (INT-022).
    - Meta catalog sync needs a Meta category mapping but no screen offers it (only TikTok) — every unmapped product reported «لا يوجد ربط تصنيف…»; deferred by fares; TikTok categories = static starter list (no TikTok category API client) + codes saved from the legacy free-text screen (INT-037).
    - `bundle_selection` in cart actions not wired; merchant order detail does not show a line's personalization (no M06 field) (INT-045).
    - Haggling drafts (`NegotiationDraft`) — no screen, not wired (INT-044).
    - Verifying the pickup code at the counter (M15/M22/POS) (INT-015).
    - `CentralCustomerTrust` is a merchant signal only; `cod_allowed` always true unless the store disabled the phone (INT-014/INT-017).
    - smsa carrier `test_connection` not wired (INT-021).
    - SMS/e-mail campaign channels have no real provider (INT-019).
    - Live-rate refs return an empty list (M04 decision); POS manager code 2468 / 200 SAR threshold mock decisions now real settings.
  - **Done when**: each item has owner, status and the user-facing wording docs must use.
  - **Status**: written in official Step 50 (2026-10-29): `docs/architecture/90-open-items.md` (§A platform open items from A.13, §B the M37 register mirror of DOC-076, §C security items from `30-security.md` §9, §D the items found in the Domain 9–16 pages). Rescued from a partial GLM run; Arabic made «…» and a quotation convention added. The execution plan's name `open-items.md` is the roadmap's `90-open-items.md`.

- [x] **DOC-527** — Publish the legacy-only features register and the legacy HTML surfaces map
  - **Source**: A.13 · Domains 1–16 "Before" lines
  - **Output**: `docs/architecture/91-legacy-surfaces.md`
  - **Must document**:
    - Legacy-only features outside contracts: dropshipping order address correction / poll now / cancel at supplier, cost-rise alerts + manual price unlock on «منتجاتي», feed delimiter/encoding/price-unit/currency-column options, live stock check at checkout, per-product pricing rules `scope='product'` (INT-039); WhatsApp QR-pairing proxy (`whatsapp_qr_start/poll`) and monthly sent counter (INT-040).
    - HTML pages kept alongside each API, per domain (e.g. `merchant/master-dashboard/`, `master-dashboard/dues/`, `sharwa-pay/`, `customer_report`, `inventory_hub_view`, `operating_expenses_view`, `staff_pos.py`, `support_hub.py`, `sharwa_ai_hub.py`, shipping screens, design forms, legacy checkout, `order_status_public_view`, Django admin actions) and the rule that both surfaces call the same services.
    - Deprecation policy recommendation.
  - **Done when**: every legacy surface is listed with its API successor.
  - **Status**: written in official Step 50 (2026-10-29): `docs/architecture/91-legacy-surfaces.md` (nine legacy-only features LF-01 → LF-09 with code evidence; the 352 legacy page routes grouped by the 16 domains with their `api/urls.py` successors; public-schema surfaces; the 17 Django admin actions; the shared-service rule table; deprecation policy recommendation). Written by Claude in this step; GLM had not produced it. Two discrepancies: the live stock check is shared with the API checkout, and "same services" holds for most areas but not locations or inventory.

- [x] **DOC-528** — Publish the known-inconsistencies register and fix tasks
  - **Source**: A.13 "Known inconsistencies"
  - **Output**: `docs/architecture/92-inconsistencies.md`
  - **Must document**:
    - `.env.example` `SHARWA_LIVE_MODULES` missing `inventory`, `locations`, `returns`, `wallets` (A.3 authoritative).
    - Old `account/stores` BFF route without consumer (superseded by `merchant/stores`, INT-003/INT-049).
    - `ready-api-v1.md` rows #11/#13 updated in INT-016; other «Ready» rows changed shape in INT-026/INT-044/INT-046 — re-audit.
    - Mock vs Django drifts already aligned (list "Mock aligned" items) so docs describe Django behaviour.
  - **Done when**: each inconsistency is either fixed (with commit reference) or scheduled.
  - **Status**: written in official Step 50 (2026-10-29): `docs/architecture/92-inconsistencies.md` (KI-01 → KI-04; each is fixed or scheduled: KI-01 → DOC-461 / Step 52, KI-02 flagged deprecated by DOC-462 and deleted in Step 52, KI-03 fixed by DOC-463, KI-04 open by policy with the unaligned fixtures listed). Rescued from a partial GLM run; KI-02 corrected from "open, no scheduled deletion" to scheduled.

---

## Track 4 — Verification, Coverage & Publishing

> Proves the documentation is correct (checked against code), complete (coverage matrix) and maintained.

### 4.1 Verification against the code and the contract

- [x] **DOC-529** — Verify every API page against Django and the Zod contracts
  - **Source**: inventory A.1 (the frontend Data Contract is the immutable source of truth) · all 49 INT tasks
  - **Output**: `docs/api/_verification.md` (one row per API page: page · Django view file · Zod schema file · checked by · date)
  - **Must document**:
    - For each endpoint documented in Track 1: route exists in `sharwa_saas/api/urls.py`, method/params/fields match the view + serializer/service, response shape matches `src/features/<module>/schemas.ts`, every Arabic message quoted matches the source string byte for byte.
    - Discrepancies are logged as issues, not silently fixed in the docs.
  - **Done when**: every Track 1 page has a verified row with no open discrepancy.
  - **Status**: done in official Step 51 (2026-10-30): `docs/api/_verification.md` §1–§4 — 69 verified rows (routes, methods, header files, 2,139 Arabic quotes, 56 test-count claims; response shapes checked live against the screens' Zod schemas, §5.6, 0 mismatches). Findings A-1, A-3, A-4, A-5 fixed in the pages; A-2 (generator misses `expenses/<pk>/` alias methods) scheduled for Step 52 as OI-24. Rescued from a partial Cline run (§1–§3 written, rows empty).

- [x] **DOC-530** — Validate the OpenAPI file and run the Postman collection against a live stack
  - **Source**: Track 1 tooling tasks · inventory A.3 (live keys), A.4 (identities/CSRF)
  - **Output**: `docs/api/_verification.md` § Live run
  - **Must document**:
    - OpenAPI file lints clean (e.g. `spectral lint` or the chosen tool's validator).
    - The Postman collection runs end to end with `SHARWA_MOCKS=off` on a local tenant: storefront visitor flow, owner flow, staff flow, courier flow, console flow (public schema), Sharwa Pay flow (platform origin) — CSRF pre-request script working for every unsafe method.
    - Failures recorded with the endpoint and status.
  - **Done when**: the run report is attached with zero unexplained failures.
  - **Status**: done in official Step 51 (2026-10-30): `docs/api/_verification.md` §5 + the run report `docs/api/postman/runs/2026-10-30-live-run.csv`. Redocly lint valid (0 errors); generators up to date; Newman smoke 0 failures on the three origins; full sweep of all 641 operations for seven identities (owner, staff, courier, visitor, platform visitor, Sharwa Pay, console) = 2,368 requests, 0 × 5xx, 0 CSRF failures, 0 unmatched routes, every non-2xx explained; CSRF pre-request script worked on all 1,300 unsafe requests. Two code defects found and documented (F-1 B2B staff sessions = OI-10; F-2 storefront 404 → 501 = OI-21). DOC-011/DOC-012's live Newman run is recorded in §5.3 (those Step 02 tasks are not ticked here).

- [x] **DOC-531** — Walk through every Track 2 guide on the running product
  - **Source**: all Track 2 tasks · inventory A.5 (roles, plan features)
  - **Output**: `docs/guides/_verification.md`
  - **Must document**:
    - Each guide is followed step by step by a reviewer in the role it targets (owner, «مدير المتجر», «مدير الفرع», cashier, courier, buyer, Sharwa Pay customer, «مالك المنصة», «مشرف تشغيلي»); every screenshot matches the current UI (enterprise navy/slate/blue theme); every quoted message appears as written.
    - RTL rendering of each page checked.
  - **Done when**: every guide page has a walkthrough row signed off by fares.
  - **Status**: done in official Step 51 (2026-10-30) and **signed off by fares on 2026-10-30**: `docs/guides/_verification.md` — 158 rows, all ☑; 317 live screen visits in all nine roles (`SHARWA_MOCKS=off`): 0 login bounces, 317/317 RTL, 0 fixture responses, 0 Zod mismatches; 8,431 quotes traced to code; G-1 (B2B staff) and G-2 (cart-restore message) annotated in the guides. Screenshots are not captured yet, so "matches the current UI" was recorded as not applicable and is re-checked once `scripts/guide-screenshots.ts` has run.

- [x] **DOC-532** — Dry-run every Track 3 runbook
  - **Source**: Track 3 runbooks · inventory A.8–A.10
  - **Output**: `docs/ops/_verification.md`
  - **Must document**:
    - Each runbook (switching a module live/rolling back, migrations across schemas, Celery worker + Beat start, re-provisioning, custom domain TLS, POS manager code, media normalisation, deployment) executed on a dev or staging copy; commands copied from the page, not from memory.
  - **Done when**: every runbook has a dry-run record.
  - **Status**: done in official Step 51 (2026-10-30): `docs/ops/_verification.md` — pass 1 (Cline, read-only, developer machine, 11 commands) + pass 2 (executed on a disposable stack, P2-1 → P2-12): dev setup, migrations incl. a reproduced missing-schema failure and resume, reverse migrations, Celery worker/Beat, re-provisioning, custom domain (Django side; DNS/Nginx/certbot need a real host), POS manager code, media normalisation, switch module live / roll back, feature rollback, `deploy.sh` and the go-live gates. Findings O-1 → O-5 fixed in the runbooks; O-6, O-7 registered as OI-22, OI-23.

### 4.2 Coverage, consistency and publishing

- [x] **DOC-533** — Prove zero omission with the INT → DOC coverage matrix
  - **Source**: inventory Part C (49 tasks), A.3 (39 live keys), A.9 (28 migrations), A.12 (49 test suites), A.13 (open items)
  - **Output**: the "Coverage matrix" appendix of this roadmap, then `docs/_coverage.md`
  - **Must document**:
    - For each INT-001…INT-049: the DOC tasks of Track 1, Track 2 and Track 3 that cover it — none may be empty in Track 1 or Track 3, and none may be empty in Track 2 unless the module has no user-facing surface.
    - For each live key, migration, Celery job, test suite and open item: the DOC task that documents it.
    - A diff of the inventory's sections vs the produced pages, re-run after each milestone.
  - **Done when**: the matrix has no empty cell and fares accepts it.
  - **Status**: done in official Step 52 (2026-10-30): `docs/_coverage.md`, generated by `docs/_tools/coverage.py` from this roadmap, the inventory, the pages and `.env.example` — 49 / 49 INT rows with Track 1 and Track 3 cells (0 empty, every INT also has Track 2 pages), 39 / 39 live keys (API page + register + `.env.example`), 28 / 28 migrations in the ledger, 28 / 28 A.8 job names on architecture/ops pages, 50 / 50 test suites in the register, 15 / 15 A.13 items in the 90/91/92 registers, 78 / 78 inventory sections with DOC tasks and 0 missing output pages; `--check` re-runs it after each change. Accepted by fares with the Step 52 sign-off (2026-10-30). The Appendix A table below remains the hand-made source; the generated page is the proof.

- [x] **DOC-534** — Run consistency checks across all pages
  - **Source**: inventory conventions · glossary
  - **Output**: `docs/_verification.md` § Consistency
  - **Must document**:
    - Internal links resolve (link checker); every page uses glossary terms; module ids, live keys, permission keys and plan-feature codes are spelled exactly as in the code; money examples follow `format_money` (A.6); no secrets, real phone numbers or real customer data in examples (fixture data only).
  - **Done when**: the checker reports zero broken links and zero term violations.
  - **Status**: done in official Step 52 (2026-10-30): `docs/_verification.md` § Consistency + `docs/_tools/check_links.py` and `check_terms.py`. Before → after: 195 → **0** broken links/anchors (181 caused by `{#id}` attributes GitHub ignores, 72 converted to `<a id>`; 6 missing anchors added; 1 wrong slug; 7 wrong relative paths), 76 → **0** term findings (T1 `.env.example`, T5 `«15.00 ر.س»`, T6 «محفظة التاجر» ×2, T7 ×72); 23 glossary rows switched to the UI label (merchant wallet «محفظة المتجر», write-off «طلبات الإعدام», courier «المناوبة», «طابور AWB», zones/SLA); a non-fixture phone in the webhook examples replaced; 279 screenshot references reported as pending (256 registered, 23 manual). 67 accepted exceptions, each with a reason, in `docs/_tools/allow.json`.

- [x] **DOC-535** — Close the known inconsistencies before publishing
  - **Source**: inventory A.13 "Known inconsistencies to fix in Phase 003 documentation"
  - **Output**: code fixes handed to fares + notes in `docs/CHANGELOG.md`
  - **Must document**:
    - `.env.example` `SHARWA_LIVE_MODULES` sample line lists every key of A.3, including `inventory`, `locations`, `returns`, `wallets`.
    - The superseded `account/stores` BFF route (no consumer since INT-003/INT-049 moved to `merchant/stores`) is removed or documented as deprecated.
    - `ready-api-v1.md` re-audited: rows #11/#13 (updated in INT-016) and the rows whose shape changed in INT-026, INT-044, INT-046.
  - **Done when**: all three are fixed in code or explicitly accepted by fares, and the docs reflect the final state.
  - **Status**: done in official Step 52 (2026-10-30): KI-01 `.env.example` (39 keys, DOC-461); KI-02 BFF `account/stores` **removed** — `src/app/api/bff/account/stores/route.ts` and `src/mocks/dashboard/stores.ts` deleted via `git rm` (commands in the step report), the `accountStore*` exports and the unused import removed from `src/features/dashboard-shell/schemas.ts`, the row removed from `src/app/api/bff/README.md`; KI-03 the re-audited table applied to `specs/001-sharwa-frontend-platform/contracts/ready-api-v1.md`. Docs updated to the final state (`92-inconsistencies.md`, `20-bff.md#deprecated`, `m03-overview.md` §7, `bff.md`, `conventions.md`, `api/CHANGELOG.md`, `environment.md`, `22-live-module-keys.md` and every page that called them pending); notes in `docs/CHANGELOG.md`. Guard for fares before committing: `npx tsc --noEmit` and `npm run lint`.

- [x] **DOC-536** — Publish and set the maintenance rule
  - **Source**: project process
  - **Output**: `docs/README.md` § Maintenance + `docs/CHANGELOG.md`
  - **Must document**:
    - Rule: any future change to a Zod schema, a Django `/api/v1/` view, a live key, a migration or a Celery job updates the matching doc page in the same change; the coverage matrix is updated with it.
    - Where the docs are published (repo only, or a static site such as MkDocs/Docusaurus — decision for fares) and how merchants reach the Arabic guides (e.g. a help link in the dashboard).
    - Final git commands for fares to run (Claude does not commit or push).
  - **Done when**: fares approves publication and the maintenance rule.
  - **Status**: done in official Step 52 (2026-10-30) and **approved by fares on 2026-10-30**: `docs/README.md#maintenance` — the rule (Zod / view / live key / migration / Celery change → doc page + changelog + regenerated coverage in the same change), the three `docs/_tools` checks before every documentation commit, publication **in the repository only for now** (static site and the dashboard «مساعدة» link later), the warning that `sharwa-frontend` is a public repository, and the git process (fares runs the commands). `docs/CHANGELOG.md` carries the closing entry.

---

## Appendix A — Coverage matrix (INT → DOC)

> **Verified in official Step 52 (DOC-533, 2026-10-30)**: `python docs/_tools/coverage.py` reads this table and finds no empty Track 1 / Track 3 cell and no missing output page; the computed view, with live keys, migrations, jobs, suites and A.13 items, is [`docs/_coverage.md`](../../docs/_coverage.md).

Generated from each task's **Source** line. Every INT task must have at least one DOC task in Track 1 and Track 3; Track 2 lists the user-facing pages.

| INT | Module | Name | Domain | Live key | Track 1 — API | Track 2 — Manuals | Track 3 — Architecture/DevOps |
|---|---|---|---|---|---|---|---|
| INT-001 | M01 | Marketing Landing Page | 1 | — (Django-first) | DOC-007, DOC-036, DOC-048 | DOC-284, DOC-290 | DOC-444, DOC-457, DOC-481 |
| INT-002 | M47 | Tenant Resolution & Guard | 1 | — (Django-first) | DOC-007, DOC-011, DOC-020, DOC-049…050, DOC-053, DOC-090, DOC-146, DOC-206, DOC-215 | DOC-284, DOC-291, DOC-293 | DOC-444, DOC-449…450, DOC-457, DOC-481, DOC-501 |
| INT-003 | M03 | Dashboard Shell, Auth & Overview | 2 | — (Django-first) | DOC-007, DOC-012, DOC-014…015, DOC-017…019, DOC-025, DOC-035, DOC-054…055, DOC-207, DOC-209 | DOC-284, DOC-288, DOC-293…296, DOC-299, DOC-383 | DOC-444, DOC-457, DOC-462, DOC-465, DOC-469, DOC-482, DOC-524 |
| INT-004 | M02 | Onboarding Wizard | 1 | — (Django-first) | DOC-007, DOC-025, DOC-037, DOC-051…053, DOC-283 | DOC-284, DOC-291…293 | DOC-444, DOC-450, DOC-457, DOC-469, DOC-481, DOC-501 |
| INT-005 | M04 | Products | 3 | `products` | DOC-007, DOC-038, DOC-041, DOC-060…064 | DOC-284, DOC-300…301 | DOC-444, DOC-456, DOC-478, DOC-480, DOC-483, DOC-514 |
| INT-006 | M05 | Catalog Organization | 3 | `catalog` | DOC-007, DOC-065…067 | DOC-284, DOC-302 | DOC-444, DOC-483 |
| INT-007 | M06 | Orders | 4 | `orders` | DOC-007, DOC-077…084, DOC-168, DOC-193, DOC-225, DOC-245 | DOC-284, DOC-310…315, DOC-357 | DOC-444, DOC-473, DOC-476, DOC-479…480, DOC-484 |
| INT-008 | M48 | Command Palette | 2 | `search` | DOC-007, DOC-039, DOC-056 | DOC-284, DOC-286, DOC-297 | DOC-444, DOC-482, DOC-523 |
| INT-009 | M49 | Notification Center | 2 | `notifications` | DOC-007, DOC-034, DOC-057…058 | DOC-284, DOC-298, DOC-426 | DOC-444, DOC-480, DOC-482 |
| INT-010 | M34 | Store Settings | 12 | `settings` | DOC-007, DOC-038, DOC-050, DOC-090, DOC-139, DOC-152, DOC-175, DOC-185, DOC-203…206 | DOC-284, DOC-289, DOC-343, DOC-352, DOC-365, DOC-371, DOC-387…388 | DOC-444, DOC-492 |
| INT-011 | M09 | Storefront Home & Catalog Listing | 5 | — (Django-first) | DOC-007, DOC-089…094 | DOC-284, DOC-318 | DOC-444, DOC-457, DOC-485, DOC-523 |
| INT-012 | M10 | Product Detail Page | 5 | — (Django-first) | DOC-007, DOC-089, DOC-092, DOC-095…097, DOC-251 | DOC-284, DOC-289, DOC-306, DOC-319 | DOC-444, DOC-457, DOC-474, DOC-485 |
| INT-013 | M11 | Cart | 5 | — (Django-first) | DOC-007, DOC-089, DOC-098…102, DOC-144, DOC-167, DOC-252 | DOC-284, DOC-289, DOC-304, DOC-320…321, DOC-346 | DOC-444, DOC-457, DOC-474, DOC-485 |
| INT-014 | M12 | Checkout | 5 | — (Django-first) | DOC-007, DOC-025, DOC-035, DOC-038, DOC-084, DOC-089, DOC-103…111, DOC-131, DOC-136, DOC-149, DOC-252 | DOC-284, DOC-313, DOC-322…325, DOC-337 | DOC-444, DOC-457, DOC-469…470, DOC-475, DOC-485, DOC-512, DOC-526 |
| INT-015 | M41 | Order Tracking | 5 | — (Django-first) | DOC-007, DOC-036, DOC-089, DOC-112…114 | DOC-284, DOC-326 | DOC-444, DOC-457, DOC-485, DOC-526 |
| INT-016 | M44 | PWA | 5 | `pwa` | DOC-007, DOC-035, DOC-089, DOC-115…117 | DOC-284, DOC-288, DOC-327, DOC-427 | DOC-444, DOC-457, DOC-463…464, DOC-470, DOC-472, DOC-475, DOC-485, DOC-498, DOC-524 |
| INT-017 | M07 | Customers | 6 | `customers` | DOC-007, DOC-025, DOC-039, DOC-046, DOC-107, DOC-109, DOC-123…131, DOC-145 | DOC-284, DOC-286, DOC-323, DOC-330, DOC-335…338, DOC-347, DOC-393 | DOC-444, DOC-448, DOC-473, DOC-486, DOC-523…524, DOC-526 |
| INT-018 | M08 | Theme Customizer | 7 | `design` | DOC-007, DOC-038, DOC-050, DOC-137…140, DOC-204 | DOC-284, DOC-341…343 | DOC-444, DOC-476, DOC-487, DOC-514 |
| INT-019 | M13 | Marketing | 7 | `marketing` | DOC-007, DOC-050, DOC-101, DOC-126, DOC-134, DOC-137, DOC-141…146, DOC-206 | DOC-284, DOC-320…321, DOC-340, DOC-344…348, DOC-350 | DOC-444, DOC-470, DOC-475, DOC-487, DOC-499 |
| INT-020 | M14 | Payments & Merchant Wallet | 8 | `payments` | DOC-007, DOC-105, DOC-150…156, DOC-204, DOC-247, DOC-274 | DOC-284, DOC-289, DOC-315, DOC-351…355 | DOC-444, DOC-468, DOC-474…477, DOC-488, DOC-509, DOC-513, DOC-519 |
| INT-021 | M15 | Shipping | 11 | `shipping` | DOC-007, DOC-084, DOC-185…194, DOC-204, DOC-221, DOC-272, DOC-278 | DOC-284, DOC-322, DOC-371…378 | DOC-444, DOC-468, DOC-476, DOC-491, DOC-526 |
| INT-022 | M18 | Staff & Permissions | 12 | `staff` | DOC-007, DOC-015, DOC-018, DOC-024, DOC-028, DOC-039, DOC-168, DOC-173, DOC-178, DOC-183, DOC-207…213, DOC-244, DOC-246 | DOC-284, DOC-286, DOC-288, DOC-295, DOC-358, DOC-362, DOC-367, DOC-370, DOC-389…393, DOC-415 | DOC-444, DOC-465, DOC-467, DOC-473, DOC-476, DOC-479, DOC-492, DOC-509, DOC-524, DOC-526 |
| INT-023 | M19 | Domains & Integrations | 12 | `integrations` | DOC-007, DOC-050, DOC-206, DOC-214…220 | DOC-284, DOC-325, DOC-394…397 | DOC-444, DOC-448, DOC-451, DOC-468, DOC-471, DOC-492, DOC-500, DOC-511…512, DOC-515…516 |
| INT-024 | M21 | Inventory | 10 | `inventory` | DOC-007, DOC-034, DOC-169…174, DOC-177, DOC-183, DOC-211, DOC-245 | DOC-284, DOC-286, DOC-301, DOC-359…363, DOC-392 | DOC-444, DOC-461, DOC-478…479, DOC-490, DOC-509, DOC-523 |
| INT-025 | M22 | Locations | 10 | `locations` | DOC-007, DOC-175…180, DOC-187, DOC-205, DOC-264 | DOC-284, DOC-360, DOC-364…368, DOC-373 | DOC-444, DOC-461, DOC-478, DOC-490, DOC-523 |
| INT-026 | M24 | Returns & RMA | 4 | `returns` | DOC-007, DOC-034, DOC-037, DOC-082, DOC-085…088 | DOC-284, DOC-311, DOC-315…317 | DOC-444, DOC-461, DOC-463, DOC-473, DOC-476…478, DOC-480, DOC-484, DOC-509 |
| INT-027 | M25 | Reports | 15 | `reports` | DOC-007, DOC-263…265 | DOC-284, DOC-296, DOC-425…426 | DOC-444, DOC-495 |
| INT-028 | M35 | Customer Wallets & Loyalty Points | 6 | `wallets` | DOC-007, DOC-025, DOC-034, DOC-106, DOC-109, DOC-124, DOC-132…136 | DOC-284, DOC-315, DOC-323, DOC-334, DOC-339…340, DOC-348 | DOC-444, DOC-457, DOC-461, DOC-469, DOC-475, DOC-477, DOC-486, DOC-523…524 |
| INT-029 | M42 | Wishlist & Reviews | 5 | — (Django-first) | DOC-007, DOC-025, DOC-034…035, DOC-089, DOC-096, DOC-118…123, DOC-129 | DOC-284, DOC-288, DOC-328…330, DOC-336 | DOC-444, DOC-457, DOC-469…470, DOC-485, DOC-509 |
| INT-030 | M20 | Platform Admin Console | 16 | `platform` | DOC-007, DOC-011…012, DOC-015…016, DOC-021, DOC-034…035, DOC-042, DOC-053, DOC-221, DOC-266…273 | DOC-284, DOC-287, DOC-431…437 | DOC-444, DOC-448, DOC-450, DOC-452…454, DOC-457, DOC-465…466, DOC-470, DOC-473, DOC-496, DOC-501, DOC-524 |
| INT-031 | M45 | Platform Dues & Sharwa Pay Administration | 16 | `platform_money` | DOC-007, DOC-038, DOC-042, DOC-162…163, DOC-190, DOC-221, DOC-274…278 | DOC-284, DOC-355, DOC-430, DOC-435, DOC-438…440 | DOC-444, DOC-448, DOC-452…453, DOC-457, DOC-472, DOC-476…477, DOC-496, DOC-509, DOC-524 |
| INT-032 | M46 | Plans, Features & Subscriptions | 16 | `platform_billing` | DOC-007, DOC-034, DOC-042, DOC-267, DOC-279…283 | DOC-284, DOC-287, DOC-441…443 | DOC-444, DOC-448, DOC-452, DOC-454, DOC-457, DOC-496 |
| INT-033 | M16 | Point of Sale | 13 | `pos` | DOC-007, DOC-025, DOC-035, DOC-037, DOC-211, DOC-242…248 | DOC-284, DOC-286…287, DOC-289, DOC-392, DOC-411…415 | DOC-444, DOC-454, DOC-469, DOC-474…476, DOC-478…479, DOC-493, DOC-502, DOC-509, DOC-513 |
| INT-034 | M17 | Affiliates & Influencers | 7 | `affiliates` | DOC-007, DOC-137, DOC-142, DOC-147…149 | DOC-284, DOC-289, DOC-315, DOC-333, DOC-349…350 | DOC-444, DOC-457, DOC-474, DOC-487, DOC-524 |
| INT-035 | M23 | Suppliers & Purchase Orders | 10 | `procurement` | DOC-007, DOC-034, DOC-181…184, DOC-211 | DOC-284, DOC-286, DOC-369…370, DOC-392 | DOC-444, DOC-473, DOC-476, DOC-478…480, DOC-490, DOC-509 |
| INT-036 | M26 | Bookings | 13 | `bookings` | DOC-007, DOC-035, DOC-098…099, DOC-109, DOC-249…252 | DOC-284, DOC-319…320, DOC-324, DOC-331, DOC-416…417 | DOC-444, DOC-457, DOC-470, DOC-473, DOC-493 |
| INT-037 | M27 | Unified Inbox & Social Channels | 13 | `channels` | DOC-007, DOC-221…230 | DOC-284, DOC-398…402 | DOC-444, DOC-448, DOC-468, DOC-471, DOC-475, DOC-493, DOC-503, DOC-512, DOC-526 |
| INT-038 | M28 | Marketplaces | 13 | `marketplaces` | DOC-007, DOC-231…234 | DOC-284, DOC-403…405 | DOC-444, DOC-468, DOC-471, DOC-493, DOC-504, DOC-511…512 |
| INT-039 | M29 | Dropshipping | 13 | `dropshipping` | DOC-007, DOC-035…036, DOC-038, DOC-221, DOC-235…241 | DOC-284, DOC-289, DOC-406…410 | DOC-444, DOC-468, DOC-474, DOC-493, DOC-505, DOC-512, DOC-514 |
| INT-040 | M30 | App Store | 14 | `apps` | DOC-007, DOC-036, DOC-221, DOC-253…256, DOC-282 | DOC-284, DOC-347, DOC-418…420, DOC-443 | DOC-444, DOC-468, DOC-494, DOC-506, DOC-512 |
| INT-041 | M31 | Sharwa AI | 14 | `sharwa_ai` | DOC-007, DOC-020, DOC-036, DOC-221, DOC-257…259 | DOC-284, DOC-421…423 | DOC-444, DOC-448, DOC-468, DOC-471, DOC-494, DOC-511…512 |
| INT-042 | M32 | Support | 14 | `support` | DOC-007, DOC-260…262 | DOC-284, DOC-423…424 | DOC-444, DOC-473, DOC-475…476, DOC-494, DOC-502 |
| INT-043 | M33 | Expenses | 8 | `expenses` | DOC-007, DOC-034, DOC-150, DOC-157…158, DOC-210 | DOC-284, DOC-286, DOC-289, DOC-356 | DOC-444, DOC-474, DOC-488 |
| INT-044 | M36 | B2B Wholesale | 9 | `b2b` | DOC-007, DOC-041, DOC-046, DOC-084, DOC-098, DOC-164…168, DOC-211 | DOC-284…286, DOC-307, DOC-319…320, DOC-357…358, DOC-392 | DOC-444, DOC-456, DOC-463…464, DOC-479…480, DOC-489, DOC-526 |
| INT-045 | M37 | Advanced Products | 3 | `advanced_products` | DOC-007, DOC-038, DOC-041, DOC-068…076, DOC-098…099, DOC-109, DOC-167 | DOC-284…285, DOC-303…306, DOC-308…309, DOC-319, DOC-332 | DOC-444, DOC-456…457, DOC-476, DOC-478, DOC-480, DOC-483, DOC-509, DOC-514, DOC-526 |
| INT-046 | M38 | Courier App | 11 | `courier` | DOC-007, DOC-015, DOC-023, DOC-034, DOC-046, DOC-195…197, DOC-201 | DOC-284, DOC-374, DOC-382…386 | DOC-444, DOC-463…465, DOC-472, DOC-491 |
| INT-047 | M39 | Sharwa Ship | 11 | `sharwa_ship` | DOC-007, DOC-198…202, DOC-278 | DOC-284, DOC-379…382 | DOC-444, DOC-476, DOC-491, DOC-502 |
| INT-048 | M40 | Sharwa Pay | 8 | `sharwa_pay` | DOC-007, DOC-011…012, DOC-015…016, DOC-022, DOC-025, DOC-034…036, DOC-038…039, DOC-108, DOC-150, DOC-159…163, DOC-198, DOC-221, DOC-276 | DOC-284, DOC-288…289, DOC-323, DOC-428…430, DOC-439 | DOC-444, DOC-448, DOC-465…466, DOC-469, DOC-474, DOC-476…477, DOC-488, DOC-514, DOC-524 |
| INT-049 | M43 | Multi-Store Rollup | 2 | `rollup` | DOC-007, DOC-015, DOC-023, DOC-055, DOC-059 | DOC-284, DOC-299 | DOC-444, DOC-448, DOC-452, DOC-462, DOC-465, DOC-472, DOC-482 |

### Part A cross-cutting sections → DOC

| Inventory section | Covered by |
|---|---|
| A.1 — Integration protocol | DOC-007, DOC-009, DOC-013, DOC-444, DOC-446…447, DOC-460, DOC-521…522, DOC-529 |
| A.2 — Next.js ↔ Django adapter patterns | DOC-007, DOC-013, DOC-037, DOC-040…045, DOC-089, DOC-164, DOC-285, DOC-444, DOC-455…458, DOC-460, DOC-519, DOC-521 |
| A.3 — Live/mock switch — every module key | DOC-010, DOC-047, DOC-117, DOC-164, DOC-174, DOC-180, DOC-184, DOC-194, DOC-202, DOC-213, DOC-217, DOC-230, DOC-241, DOC-248, DOC-256, DOC-273, DOC-459…460, DOC-511, DOC-517…518, DOC-530, DOC-533 |
| A.4 — Identities, sessions and CSRF | DOC-003, DOC-008, DOC-011…012, DOC-015…018, DOC-020…023, DOC-025, DOC-035, DOC-089, DOC-159, DOC-195, DOC-266, DOC-284, DOC-288, DOC-293…294, DOC-383, DOC-431, DOC-448…449, DOC-465…466, DOC-530 |
| A.5 — Gate order, plan features, permission keys | DOC-003, DOC-008, DOC-026…029, DOC-037, DOC-117, DOC-141, DOC-158, DOC-202, DOC-208, DOC-210, DOC-222, DOC-242, DOC-271, DOC-281, DOC-284, DOC-286…288, DOC-454, DOC-467, DOC-531 |
| A.6 — Money, currencies and formatting | DOC-003, DOC-008, DOC-030…031, DOC-095, DOC-150, DOC-156, DOC-232, DOC-237, DOC-245, DOC-274, DOC-289, DOC-408, DOC-474 |
| A.7 — Idempotency and optimistic locking | DOC-008, DOC-032…033, DOC-037, DOC-109, DOC-133, DOC-138, DOC-145, DOC-155, DOC-183, DOC-193, DOC-199, DOC-211, DOC-224, DOC-244…245, DOC-261, DOC-275, DOC-288, DOC-324, DOC-475…476 |
| A.8 — Background jobs (Celery/Beat) | DOC-073, DOC-116, DOC-145, DOC-200, DOC-218…219, DOC-224, DOC-228, DOC-233, DOC-240, DOC-248, DOC-255, DOC-261, DOC-268, DOC-272, DOC-450, DOC-497…507, DOC-517, DOC-532 |
| A.9 — Migrations ledger | DOC-057, DOC-060, DOC-073, DOC-130, DOC-143, DOC-154, DOC-158, DOC-174, DOC-180, DOC-194, DOC-213, DOC-230, DOC-241, DOC-248, DOC-256, DOC-273, DOC-508…510, DOC-517…518, DOC-533 |
| A.10 — Environment, dependencies, management commands | DOC-011, DOC-038, DOC-138, DOC-140, DOC-214, DOC-217, DOC-231, DOC-246, DOC-258…259, DOC-451, DOC-507, DOC-510…517, DOC-532 |
| A.11 — Cross-cutting infrastructure fixes | DOC-016, DOC-035, DOC-039…040, DOC-044, DOC-046, DOC-092, DOC-115, DOC-124, DOC-127, DOC-168, DOC-197, DOC-273, DOC-452, DOC-455, DOC-464, DOC-515, DOC-519, DOC-523…525 |
| A.12 — Test suites | DOC-007, DOC-009, DOC-174, DOC-180, DOC-184, DOC-194, DOC-202, DOC-213, DOC-217, DOC-230, DOC-241, DOC-248, DOC-256, DOC-273, DOC-285, DOC-520…522, DOC-533 |
| A.13 — Open items, legacy-only features, known inconsistencies | DOC-014, DOC-044, DOC-055, DOC-076, DOC-114, DOC-213, DOC-228, DOC-239, DOC-256, DOC-461…463, DOC-517, DOC-526…528, DOC-533, DOC-535 |
