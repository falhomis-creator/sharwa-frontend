---
description: "Phase 003 — step-by-step execution plan for producing every page of documentation-roadmap.md, plus the single reusable prompt that drives each step"
source: "specs/003-documentation/documentation-roadmap.md (536 DOC tasks, 54 subsections)"
created: 2026-10-26
---

# Phase 003 — Execution Plan (خطة تنفيذ التوثيق)

## 1. Execution model

- **Unit of work = one step = one roadmap subsection** (`### x.y …`), or half of a large one. A step is run in a **fresh chat session** in the `sharwa_front` project with both folders linked (`C:\sharwa_front\sharwa-frontend`, `C:\sharwa_saas`). 54 subsections → **52 steps** below.
- Each step reads **only** its DOC range from the roadmap (the file is 530 KB — never load it whole), reads the code the tasks name, writes the pages at the **Output** paths, ticks the tasks `[x]`, bumps the status counter in the roadmap frontmatter, and ends with the git commands for fares.
- Steps inside one milestone are independent — they may run in parallel sessions. Milestones run in order because later pages link to earlier ones (templates, glossary, auth/conventions/BFF pages).
- Several DOC tasks usually share one output page (e.g. `m27-inbox-channels.md` collects DOC-222…232). The writer appends sections to the page in task order; the page is "done" when its last task is ticked.
- The writer verifies against the **code**, not the inventory. A difference between roadmap and code is documented as the code behaves, flagged in the page with a `> ⚠️ Discrepancy` call-out, and listed in the step report — never silently "fixed".
- Claude never runs `git commit` / `git push`; fares does, after reviewing each step.

## 2. Steps by milestone

| Step | Milestone | Subsection | DOC range | Tasks | What comes out |
|---|---|---|---|---|---|
| 01 | M-1 Foundations | 0.1 Documentation home, structure and ownership | DOC-001 → 006 | 6 | `docs/README.md`, tree + stubs, `glossary.md`, `_templates/*`, language policy + milestones decisions |
| 02 | M-1 | 1.1 API documentation tooling | DOC-007 → 014 | 8 | OpenAPI tooling decision, `openapi/sharwa-v1.yaml` skeleton, Postman collection + environments + CSRF script, contract-diff procedure |
| 03 | M-1 | 1.2 Authentication & identity flows | DOC-015 → 025 | 11 | `docs/api/overview/auth.md`, `csrf.md`, OTP families table |
| 04 | M-1 | 1.3 Cross-cutting API conventions | DOC-026 → 039 | 14 | `conventions.md`, `errors.md`, `money.md`, `idempotency.md`, `conflicts.md`, `pagination.md`, `rate-limits.md`, feature/permission matrices |
| 05 | M-1 | 1.4 BFF layer reference | DOC-040 → 047 | 8 | `docs/api/overview/bff.md` + live-key ↔ route map |
| 06 | M-1 | 3.1 System overview + 3.2 Multi-tenant architecture | DOC-444 → 454 | 11 | `docs/architecture/overview.md`, `multi-tenancy.md`, provisioning, custom domains |
| 07 | M-1 | 3.3 BFF & live/mock switch architecture | DOC-455 → 464 | 10 | `docs/architecture/bff.md`, switch runbook, `.env.example` fix task, Ready-list re-audit |
| 08 | M-1 | 3.4 Security + 3.5 Data & money integrity | DOC-465 → 480 | 16 | `docs/architecture/security.md`, `money.md`, `concurrency.md`, ledgers/approvals/audit |
| 09 | M-1 | 3.9 Environment & commands + 3.11 Testing & QA | DOC-511 → 514, DOC-520 → 522 | 7 | `docs/ops/environment.md`, `management-commands.md`, `testing.md` |
| 10 | M-1 | 2.1 Manual framework | DOC-284 → 289 | 6 | Arabic style guide, screenshot pipeline, role/permission matrix, plan-feature matrix, 403 troubleshooting, money display page |
| 11 | M-2 Buyer journey | 1.5 Domain 1 API + 1.6 Domain 2 API | DOC-048 → 059 | 12 | `docs/api/domains/01-*/`, `02-*/` |
| 12 | M-2 | 1.9 Domain 5 API (part A: home, PDP, cart, checkout) | DOC-089 → 106 | 18 | `docs/api/domains/05-storefront/` first half |
| 13 | M-2 | 1.9 Domain 5 API (part B: checkout mapping, tracking, PWA, engagement) | DOC-107 → 123 | 17 | `docs/api/domains/05-storefront/` second half |
| 14 | M-2 | 2.2 Getting started | DOC-290 → 299 | 10 | `docs/guides/merchant/01-*`, `02-*` |
| 15 | M-2 | 2.5 Buyer help centre (part A) | DOC-318 → 326 | 9 | `docs/guides/buyer/` browsing → tracking |
| 16 | M-2 | 2.5 Buyer help centre (part B) | DOC-327 → 334 | 8 | `docs/guides/buyer/` PWA, wishlist, reviews, bookings, auctions, referral |
| 17 | M-3 Merchant core | 1.7 Domain 3 API (part A: products, organization) | DOC-060 → 068 | 9 | `docs/api/domains/03-catalog/` |
| 18 | M-3 | 1.7 Domain 3 API (part B: advanced products, CSV) | DOC-069 → 076 | 8 | `docs/api/domains/03-catalog/m37-advanced-products.md` |
| 19 | M-3 | 1.8 Domain 4 API | DOC-077 → 088 | 12 | `docs/api/domains/04-orders-returns/` |
| 20 | M-3 | 1.10 Domain 6 API | DOC-124 → 136 | 13 | `docs/api/domains/06-customers-wallets/` |
| 21 | M-3 | 1.11 Domain 7 API | DOC-137 → 149 | 13 | `docs/api/domains/07-marketing-design-partners/` |
| 22 | M-3 | 1.12 Domain 8 API | DOC-150 → 163 | 14 | `docs/api/domains/08-finance/` |
| 23 | M-3 | 1.14 Domain 10 API (part A: inventory, locations) | DOC-169 → 177 | 9 | `docs/api/domains/10-*/m21-inventory.md`, `m22-locations.md` |
| 24 | M-3 | 1.14 Domain 10 API (part B: procurement) | DOC-178 → 184 | 7 | `docs/api/domains/10-*/m23-procurement.md` |
| 25 | M-3 | 1.15 Domain 11 API (part A: shipping settings/ops) | DOC-185 → 194 | 10 | `docs/api/domains/11-shipping/m15-shipping.md` |
| 26 | M-3 | 1.15 Domain 11 API (part B: courier app, Sharwa Ship) | DOC-195 → 202 | 8 | `m38-courier-app.md`, `m39-sharwa-ship.md` |
| 27 | M-3 | 1.16 Domain 12 API | DOC-203 → 217 | 15 | `docs/api/domains/12-settings-staff-integrations/` |
| 28 | M-3 | 1.17 Integrator specs (webhooks) + 1.20 Domain 15 API | DOC-218 → 221, DOC-263 → 265 | 7 | `docs/api/integrators/`, `docs/api/domains/15-reports/` |
| 29 | M-3 | 2.3 Catalog manuals | DOC-300 → 309 | 10 | `docs/guides/merchant/03-catalog/` |
| 30 | M-3 | 2.4 Orders & returns manuals | DOC-310 → 317 | 8 | `docs/guides/merchant/04-orders-returns/` |
| 31 | M-3 | 2.6 Customers/wallets + 2.8 Finance manuals | DOC-335 → 340, DOC-351 → 356 | 12 | `06-*`, `08-*` guides |
| 32 | M-3 | 2.7 Marketing, design & partners manuals | DOC-341 → 350 | 10 | `07-*` guides |
| 33 | M-3 | 2.10 Inventory, locations & procurement manuals | DOC-359 → 370 | 12 | `10-*` guides |
| 34 | M-3 | 2.11 Shipping & Sharwa Ship + 2.12 Courier app guide | DOC-371 → 386 | 16 | `11-*` guides, `docs/guides/courier/` |
| 35 | M-3 | 2.13 Settings, staff, domains & integrations manuals | DOC-387 → 397 | 11 | `12-*` guides |
| 36 | M-3 | 2.16 Reports manuals | DOC-425 → 427 | 3 | `15-*` guides |
| 37 | M-3 | 3.6 Data model (Domains 1–8) | DOC-481 → 488 | 8 | `docs/architecture/data-model/0N-*.md` |
| 38 | M-3 | 3.7 Background jobs | DOC-497 → 507 | 11 | `docs/architecture/jobs/*`, Celery/Beat runbook |
| 39 | M-3 | 3.8 Migrations ledger + 3.10 Deployment + 3.12 Infra fixes | DOC-508 → 510, DOC-515 → 519, DOC-523 → 525 | 11 | `docs/ops/migrations.md`, `deployment.md`, Windows dev setup, shared libraries |
| 40 | M-4 Console | 1.21 Domain 16 API (part A: M20 console) | DOC-266 → 274 | 9 | `docs/api/domains/16-platform-console/m20-console.md` |
| 41 | M-4 | 1.21 Domain 16 API (part B: M45 dues/Sharwa Pay admin, M46 billing) | DOC-275 → 283 | 9 | `m45-dues-sharwa-pay-admin.md`, `m46-plans-billing.md` |
| 42 | M-4 | 2.18 Platform console manual | DOC-431 → 443 | 13 | `docs/guides/console/` |
| 43 | M-5 P3 modules | 1.13 Domain 9 API + 1.19 Domain 14 API | DOC-164 → 168, DOC-253 → 262 | 15 | `09-b2b/`, `14-apps-ai-support/` |
| 44 | M-5 | 1.18 Domain 13 API (part A: inbox & channels) | DOC-222 → 232 | 11 | `13-*/m27-inbox-channels.md` |
| 45 | M-5 | 1.18 Domain 13 API (part B: marketplaces, dropshipping) | DOC-233 → 242 | 10 | `m28-marketplaces.md`, `m29-dropshipping.md` |
| 46 | M-5 | 1.18 Domain 13 API (part C: POS, bookings) | DOC-243 → 252 | 10 | `m16-pos.md`, `m26-bookings.md` |
| 47 | M-5 | 2.9 B2B + 2.15 Apps/AI/support + 2.17 Sharwa Pay manuals | DOC-357 → 358, DOC-418 → 424, DOC-428 → 430 | 12 | `09-*`, `14-*` guides, `docs/guides/sharwa-pay/` |
| 48 | M-5 | 2.14 Sales channels manuals (part A: inbox, channels, marketplaces, dropshipping) | DOC-398 → 408 | 11 | `13-*` guides |
| 49 | M-5 | 2.14 Sales channels manuals (part B: POS, bookings) | DOC-409 → 417 | 9 | `13-*` guides |
| 50 | M-5 | 3.6 Data model (Domains 9–16) + 3.13 Open items register | DOC-489 → 496, DOC-526 → 528 | 11 | `data-model/09-*…16-*.md`, `docs/architecture/90-open-items.md`, `91-legacy-surfaces.md`, `92-inconsistencies.md` |
| 51 | M-6 Verification | 4.1 Verification against code and contract | DOC-529 → 532 | 4 | `_verification.md` files, Postman live run, guide walkthroughs, runbook dry-runs |
| 52 | M-6 | 4.2 Coverage, consistency & publishing | DOC-533 → 536 | 4 | `docs/_coverage.md`, link/term checks, A.13 fixes, publishing decision |

**Total: 52 steps / 536 tasks.** Suggested cadence: Steps 01–10 first (everything else links to them), then the rest in milestone order; within a milestone run 2–3 steps in parallel sessions if you like.

## 3. Per-step checklist (what "done" means for a step)

1. Every DOC task in the range is either ticked `[x]` or left `[ ]` with a one-line reason in the step report (blocked by a decision, code not found, etc.).
2. Every **Output** path exists and contains a section per task, in task order, written from the template in `docs/_templates/`.
3. Every **Must document / Must cover** bullet is covered as real content (prose, tables, request/response examples, diagrams) — not pasted as a checklist.
4. Every Arabic string the page quotes was copied from the source code (`grep` it), not from the roadmap.
5. Links to pages that do not exist yet are allowed only when the target path is one listed in the roadmap.
6. The roadmap frontmatter `status:` line shows the new count (`N / 536 tasks`), and `docs/CHANGELOG.md` has an entry for the step.
7. `git status` lists only files under `docs/`, `specs/003-documentation/` (and, for Step 52 only, the three A.13 code fixes).

## 4. The reusable prompt template

Copy the block below into a new chat, fill the `{{…}}` fields from the table in §2, and send it. Nothing else is needed; the prompt tells the session where everything is.

````markdown
**[PHASE 003 — DOCUMENTATION STEP {{STEP}} / 52]**

**Variables**
- MILESTONE: {{MILESTONE}}  (e.g. M-3 Merchant core)
- SUBSECTION: {{SUBSECTION}}  (e.g. `### 1.12 Domain 8 API — Finance`)
- DOC RANGE: {{DOC_FROM}} → {{DOC_TO}}
- NOTES: {{OPTIONAL_NOTES_OR_NONE}}

**Context**
- Frontend (Next.js): `C:\sharwa_front\sharwa-frontend` — roadmap at `specs\003-documentation\documentation-roadmap.md`, execution plan at `specs\003-documentation\execution-plan.md`, docs tree under `docs\`.
- Backend (Django): `C:\sharwa_saas` — routes in `api/urls.py`, views `api/views_*.py`, serializers `api/serializers_*.py`, services under `products/services/`, `tenants/`, `sharwapay/`, migrations under each app, tests `api/test_*_api.py`.
- Language policy: Track 1 (API) and Track 3 (architecture/ops) in English; Track 2 (guides) in Arabic, RTL. Arabic server/UI sentences are always quoted verbatim in «…».
- Standing rules: write files directly into the repos; never run `git commit` or `git push`; do not change application code (documentation only — except Step 52's three listed fixes); do not ask for permission before starting.

**Do this, in order**
1. Open the roadmap and read ONLY the subsection `{{SUBSECTION}}` (tasks {{DOC_FROM}} → {{DOC_TO}}). Do not load the whole file. Read `docs/README.md`, `docs/glossary.md` and the matching template in `docs/_templates/` (api-endpoint / guide-page / architecture-page / runbook).
2. For each task in the range, in order:
   a. Read the source the task names: the Django URL entry, view, serializer, service, model/migration and test file; the frontend `src/features/<module>/schemas.ts`, `src/mocks/<module>`, and the BFF route under `src/app/api/bff/`. Grep every Arabic message the task quotes so it is copied from code.
   b. Write (or append to) the page at the task's **Output** path, following the template. Turn every **Must document / Must cover** bullet into real documentation: endpoint tables (method · path · query · body · response · status codes · messages), gate chain (session → plan feature → permission key → owner-only → state), rules and mappings, examples with fixture data only, sequence/state diagrams in Mermaid where the task asks for one, screenshot placeholders `![…](../../_assets/<audience>/<NN-slug>/<page>-<n>.png) <!-- capture: <route> -->` for Track 2 (convention in `docs/README.md` §5.4).
   c. If the code differs from the roadmap, document the code's behaviour and add a `> ⚠️ Discrepancy — roadmap says … / code does …` call-out; collect it for the report. If a path the roadmap could not name (e.g. "copy from `api/urls.py`") — resolve it from the code and write the real path.
   d. Tick the task `- [ ]` → `- [x]` in the roadmap when its page section is complete.
3. Update the roadmap frontmatter `status:` to the new `N / 536 tasks` count. Append a `docs/CHANGELOG.md` entry: date, step, DOC range, files added/changed.
4. Quality gate: every internal link in the new pages points at an existing page or at a path listed in the roadmap; no secrets, tokens, real phone numbers or real customer data; glossary terms used consistently; Track 2 pages render RTL (`<div dir="rtl">` or the site's RTL convention from `docs/README.md`).
5. Report back, briefly: (a) files created/updated with paths; (b) tasks ticked and tasks left open with reasons; (c) discrepancies found; (d) decisions you need from me (one line each); (e) the exact `git add` / `git commit -m "docs(phase-003): step {{STEP}} — {{SUBSECTION_SHORT}} ({{DOC_FROM}}–{{DOC_TO}})"` / `git push` commands for me to run.
````

### Filling example (Step 22)

```
STEP: 22 · MILESTONE: M-3 Merchant core · SUBSECTION: ### 1.12 Domain 8 API — Finance: payments, merchant wallet, expenses & Sharwa Pay · DOC RANGE: DOC-150 → DOC-163 · NOTES: none
```

### When a step is too big for one session

Split the range in half and run the template twice with the same SUBSECTION and the two sub-ranges (the roadmap ticks keep the state, so the second session continues cleanly). Add `NOTES: continuation of Step NN — tasks DOC-xxx…yyy already ticked` so the second session skips them.
