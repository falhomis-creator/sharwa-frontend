# Documentation changelog

One entry per execution step of [`specs/003-documentation/execution-plan.md`](../specs/003-documentation/execution-plan.md), newest first.

## 2026-10-30 — Official Step 52 · M-6 · 4.2 Coverage, consistency & publishing (DOC-533 → 536) — Phase 003 closing step

**Verified first**: the Step 52 row of `execution-plan.md` reads Milestone **M-6**, subsection "4.2 Coverage, consistency & publishing", DOC-533 → 536, 4 tasks, outputs "`docs/_coverage.md`, link/term checks, A.13 fixes, publishing decision"; rule 7 of the plan allows, for this step only, the three A.13 code fixes.
**How it was done**: the developer machine's shell was unavailable, so every page under `docs/` (381 Markdown files), the roadmap, the inventory and the code files the fixes touch were staged into the cloud workspace, checked and edited there, and written back. The checks are now scripts in the repository (`docs/_tools/`), so fares can re-run them.
**Sign-offs taken from fares in this step (2026-10-30)**: DOC-007 (hybrid OpenAPI strategy), DOC-014 (versioning and deprecation policy), DOC-284 (Arabic style guide and guides glossary), DOC-011 + DOC-012 (the Step 51 live Newman run accepted as their acceptance; staging environments later), DOC-522 (CI **option A**), DOC-536 (maintenance rule; publication **in the repository only, for now**).
**Ticked**: DOC-007, DOC-011, DOC-012, DOC-014, DOC-284, DOC-461, DOC-522, DOC-533, DOC-534, DOC-535, DOC-536 (11 tasks). Roadmap status **524 → 535 / 536**.

**Added**
- `docs/_coverage.md` (DOC-533): the zero-omission proof, generated — 49 / 49 INT rows with Track 1 and Track 3 tasks (0 empty cells), 39 / 39 live keys (API page + register + `.env.example`), 28 / 28 migrations, 28 / 28 A.8 job names, 50 / 50 test suites, 15 / 15 A.13 items, 78 / 78 inventory sections with DOC tasks, 0 missing output pages.
- `docs/_verification.md` (DOC-534): the consistency report — rules, before/after numbers, every fix, the glossary reconciliation, accepted exceptions, the A.13 code fixes and the publishing consequences.
- `docs/_tools/` — `check_links.py` (links and GitHub anchors; pending screenshots apart), `check_terms.py` (T1–T9: live keys, module ids, permission keys, plan features, `format_money`, UI words, `{#id}` anchors, fixture phones, secrets), `coverage.py` (regenerates `_coverage.md`; `--check` for CI), `allow.json` (67 reasoned exceptions), `README.md`.

**Changed — consistency fixes (DOC-534)**
- Links: 195 → **0** broken. 72 `{#id}` attributes (71 headings in the Domain 5 and 6 API pages + one inline) became `<a id>` anchors — GitHub ignores `{#id}`, which broke 181 links; 6 missing anchors added (`dev-setup-windows.md`, `management-commands.md` ×4, `m11-cart.md`); 1 wrong slug (`m20-console.md`); 7 wrong relative paths (`90-open-items.md`, `data-model/15-reports.md`).
- Terms: «محفظة التاجر» → «محفظة شروة باي للتاجر» in two console guides and → «محفظة المتجر» in the M14 titles; «محفظة شروة» → «محفظة شروة باي» in the M40 titles; «طلبات الإتلاف» → «طلبات الإعدام» in `permissions-matrix.md`; `display_commission` example «15.00 ر.س» → «15 ر.س» (`format_money`); a phone number copied from a code comment replaced by the fixture `771234567` in `webhooks-events.md`.
- `docs/glossary.md`: 23 rows now carry the UI label from `guides/_glossary.md` (legend **✓ (UI)**), e.g. merchant wallet «محفظة المتجر», write-off «طلبات الإعدام», courier shift «المناوبة», «طابور AWB», «مناطق شروة شيب» · «النطاقات المحظورة» · «قواعد SLA».
- `docs/guides/_screenshots.md`: note on the 23 image references outside the manifest (20 console pages, CSV import/export).

**Changed — A.13 fixes in code (DOC-535)** — handed to fares, see the git commands
1. KI-01 / DOC-461 — `.env.example`: the `SHARWA_LIVE_MODULES` sample line lists all 39 keys (adds `inventory`, `locations`, `returns`, `wallets`); the comment block gained `integrations`, `inventory`, `locations`, `returns`, `wallets`.
2. KI-02 — the superseded BFF route `account/stores` is **removed**: `src/app/api/bff/account/stores/route.ts` and `src/mocks/dashboard/stores.ts` deleted (`git rm`), the `accountStoreSchema` / `accountStoresSchema` / `AccountStore` exports and the now-unused import removed from `src/features/dashboard-shell/schemas.ts` (header comment updated), the row removed from `src/app/api/bff/README.md`. Run `npx tsc --noEmit` and `npm run lint` before committing.
3. KI-03 — `specs/001-sharwa-frontend-platform/contracts/ready-api-v1.md`: the re-audited table of `architecture/23-ready-api-v1-audit.md` §6 applied (30 rows, «Changed by» column).
- Docs moved to the final state: `architecture/92-inconsistencies.md` (KI-01/02/03 fixed), `architecture/20-bff.md#deprecated`, `api/domains/02-dashboard-shell/m03-overview.md` §7, `api/overview/bff.md`, `api/overview/conventions.md`, `api/CHANGELOG.md` (route **Removed**), `m43-multi-store.md`, `ops/environment.md` §1, `architecture/22-live-module-keys.md` (parity table ✓), `00-system-overview.md`, `01-domain-map.md`, `02-integration-protocol.md`, `m21-inventory.md`, `m22-locations.md`, `m24-returns.md`, `ops/deployment/go-live-checklist.md`, `ops/testing/ci.md`.

**Changed — publishing and sign-offs (DOC-536 and the Step 02/09/10 tasks)**
- `docs/README.md` §7 **Maintenance** (`#maintenance`): the rule, the three checks before every documentation commit, the publishing decision (repository only, for now; static site and the dashboard «مساعدة» link later), a warning that `falhomis-creator/sharwa-frontend` is a **public** repository (the security pages are public with it), and the git process; the tree and the shared-references line list the new pages.
- `api/openapi/README.md` (DOC-007 ☑), `api/overview/conventions.md#versioning` (DOC-014 ☑), `api/overview/csrf.md` (DOC-011/012 acceptance), `guides/_style-guide.md` and `guides/_glossary.md` («معتمد», DOC-284), `ops/testing/ci.md` (decision: option A).
- `specs/003-documentation/documentation-roadmap.md`: 11 ticks with Status lines, a verification note on Appendix A, frontmatter status **535 / 536**.

**Left open**: **DOC-520** — the test-suite register must match a real discovery count (`DiscoverRunner.build_suite()` on `sharwa_saas`, command in `ops/testing/django-suites.md`); it needs a Python run on fares's machine. Not blocking: 279 guide screenshots to capture (256 by `scripts/guide-screenshots.ts`, 23 by hand); the staging checks of DOC-508/510/517/519; the code defects in `architecture/90-open-items.md` (OI-10 B2B staff sessions, OI-21 storefront 404 → 501, …); the two code follow-ups of the Ready-list audit (`geo_required` in `src/features/courier/schemas.ts`, the "proposed" wording of `b2bDraftSchema`).

### Phase 003 — closing summary

Phase 003 turned the 49 integrated modules into three documentation tracks in 52 official steps (2026-10-26 → 2026-10-30): **Track 1** — 69 English API pages, OpenAPI `sharwa-v1.yaml` (641 operations) and a Postman collection run live with 0 × 5xx and 0 CSRF failures over 2,368 requests; **Track 2** — 158 Arabic RTL guide pages for owners, staff, buyers, couriers, Sharwa Pay customers and the platform console, walked live in nine roles and signed off; **Track 3** — architecture, data model (16 domains), jobs, migrations, environment, deployment, testing and runbooks dry-run on a disposable stack; **Track 4** — verification, a generated zero-omission matrix, consistency checks that run in one command, and a maintenance rule. 535 of 536 tasks are done; DOC-520 waits for one Python run.

## 2026-10-30 — Official Step 51 · M-6 Verification · 4.1 Verification against code and contract (DOC-529 → 532) — rescue and completion (step complete)

**Verified first**: the Step 51 row of `execution-plan.md` reads Milestone **M-6 Verification**, subsection "4.1 Verification against code and contract", DOC-529 → 532, 4 tasks, outputs "`_verification.md` files, Postman live run, guide walkthroughs, runbook dry-runs".
**Starting state (Cline partial run, 2026-10-29)**: `docs/api/_verification.md` had §1–§3 (a static pass over the 69 API pages, findings A-1 → A-3) but an empty §4 row table (`<!--ROWS-->`) and no §5 live run; `docs/ops/_verification.md` had a read-only record of 11 commands on the developer machine (finding O-1) and no record for most runbooks; `docs/guides/_verification.md` did not exist. No roadmap task was ticked and nothing was recorded here. Cline changed no application code.
**How it was completed**: on a disposable verification stack (an isolated container: `sharwa_saas` at the last code commit `e3df05a`, `sharwa-frontend` at `bd9a690`, PostgreSQL 16, Redis 7, Celery worker + Beat, Next.js with `SHARWA_MOCKS=off`), with a store registered through the product, nine real accounts (owner, «مدير المتجر», «مدير الفرع», «كاشير», courier, buyer, Sharwa Pay customer, «مالك المنصة», «مشرف تشغيلي») and a local stand-in for Green API so WhatsApp codes could be read without sending anything.
**Ticked**: DOC-529, DOC-530, DOC-531, DOC-532 (4 tasks — Step 51 complete). DOC-531 was ticked after fares signed off all 158 walkthrough rows of `docs/guides/_verification.md` §4 on 2026-10-30. Roadmap status is now 524 / 536; next is official Step 52.

**Added**
- `docs/guides/_verification.md` (DOC-531): method, findings G-1 → G-4, one row per guide page (158) with the routes walked live in the page's role, quotes traced to code, RTL check and a sign-off column for fares (all rows signed off by fares on 2026-10-30).
- `docs/api/postman/runs/2026-10-30-live-run.csv` (DOC-530): the run report — 2,368 requests (identity, method, path, status, class).

**Changed**
- `docs/api/_verification.md` (DOC-529, DOC-530): completed — independent re-run of the static checks, the 69-row table, findings A-4, A-5, F-1, F-2 added and A-1/A-3 closed, §5 live run (Redocly lint, generator freshness, Newman smoke, full sweep of the 641 operations for seven identities, end-to-end flows, live Zod check).
- `docs/ops/_verification.md` (DOC-532): rewritten around two passes — Cline's read-only record kept as pass 1; pass 2 executes every runbook (P2-1 → P2-12: dev setup, migrations incl. a reproduced failure and resume, reverse migrations, Celery, re-provisioning, custom domain (Django side), POS manager code, media normalisation, switch module live, feature rollback, `deploy.sh`, go-live gates); findings O-1 → O-7.
- Documentation fixes from the findings (each logged in the verification pages first):
  - A-1 `api/overview/auth.md` §6: «الرموز الشخصية» (was «مفاتيح شخصية»).
  - A-3 `api/overview/auth.md`, `errors.md`, `conventions.md` and the gate rows of `m03-auth`, `m43`, `m48`, `m49`, `m05`, `m18`, `m19`, `m34`, `m25`, `m38`, `m39`: the second public-host body «لم يتم تزويد بيانات الدخول.» and the rule (anchor `auth.md#no-store-no-session`).
  - A-4 `m30-app-store.md`: `scripts/apps-support-check.ts`.
  - A-5 `m41-order-tracking.md`, `domains/05-storefront/README.md`: 12 tests.
  - F-1 `m36-b2b-wholesale.md` §2/§6 and the guides `09-b2b/create-draft.md`, `approve-drafts.md`: the live staff-session gap of the B2B draft routes.
  - O-1 `ops/runbooks/migrations.md` §1.2, `ops/deployment/go-live-checklist.md` G3: the ~980 expected `drf_spectacular` warnings.
  - O-2 `ops/management-commands.md` §3.2: keep the `--apply` output, not the preview.
  - O-3 `ops/runbooks/migrations.md` §4, §6: the schema prefix is TTY-only and a missing schema fails before its prefix.
  - O-4, O-5 `ops/dev-setup-windows.md`, `ops/testing/frontend-qa.md`: no `logs/` on a fresh clone; `npx next typegen` before `tsc`.
  - G-2 `guides/buyer/05-storefront/cart-reminders.md`: «قيد معروف» for the expired-link message («غير متاح بعد.» on screen).
- `docs/architecture/90-open-items.md`: OI-10 wording (staff get `401`); new §E with OI-21 → OI-24 from the live run.
- `docs/api/README.md`, `docs/guides/README.md`, `docs/ops/README.md`, `docs/ops/runbooks/README.md`: status cells of the verification pages and runbooks.
- `specs/003-documentation/documentation-roadmap.md`: ticks and Status lines for Step 51; status line.

**Code defects found by the live run** (documented, not fixed — Phase 003 changes no application code; for fares)
1. F-1 — the three B2B draft routes refuse every real staff session (`401` «غير مصرح لك بالوصول.»): `MerchantAPIMixin.check_merchant` requires the owner flag that `StaffLoginView` removes; the tests fake a session with both. Already OI-10 from the code; now confirmed live.
2. F-2 — with mocks off the storefront BFF answers `501` «غير متاح بعد.» for every Django `404` (expired cart-restore link, unknown order or tracking link, hidden product). Already open in `bff.md` §4.6; now confirmed live (OI-21).

**Left open**: the steps that need a production host (systemd, Docker, Nginx, certbot, real DNS, `DEBUG=False`), a restore from a dump and the data-blocked reverse migrations (`ops/_verification.md` §6); screenshots are still not captured, so the guides' "matches the current UI" bullet waits for `scripts/guide-screenshots.ts`; A-2 / OI-24 and O-7 / OI-23 go with the Step 52 fixes; the two code defects F-1 and F-2 need a decision and a code change by fares.

## 2026-10-29 — Official Step 50 · M-5 · 3.6 Data model (Domains 9–16) + 3.13 Open items register (DOC-489 → 496, DOC-526 → 528) — rescue, completion and audit

**Verified first**: the Step 50 row of `execution-plan.md` reads Milestone **M-5**, subsections "3.6 Data model (Domains 9–16) + 3.13 Open items register", DOC-489 → 496 and DOC-526 → 528, 11 tasks. Its output column named `docs/architecture/open-items.md`; the roadmap's Output lines (and GLM's files) use `90-open-items.md`, `91-legacy-surfaces.md` and `92-inconsistencies.md` — the plan row was corrected to the roadmap names.
**Starting state (GLM partial run)**: `09`, `10`, `11`, `12`, `15`, `16`, `90-open-items.md` and `92-inconsistencies.md` existed; `13-channels-operations.md`, `14-apps-ai-support.md` and `91-legacy-surfaces.md` did not; no roadmap task was ticked and nothing was recorded in the changelog.
**Ticked**: DOC-489 → 496 and DOC-526 → 528 (11 tasks). Roadmap status is now 520 / 536; next is official Step 51 (4.1 Verification against code and contract, DOC-529 → 532).
**Sources verified against code**: `sharwa_saas` models (`products/models/*`, `tenants`, `billing`, `sharwapay`, `appstore`, `sharwa_ship`), the services behind each domain, `api/urls.py` and the `api/views_*.py` modules, `config/urls_tenant.py` and `urls_public.py`, the legacy `products/views/*` modules, the admin modules and the API test suites; every «…» quote was machine-checked against the source strings.

**Added**
- `docs/architecture/data-model/13-channels-operations.md` (DOC-493): inbox and channels, marketplaces, dropshipping, POS and bookings — models, engine services, code mappings, 4 ER diagrams, POS shift and booking-slot state machines, 29 invariants, test inventory.
- `docs/architecture/data-model/14-apps-ai-support.md` (DOC-494): app store, Sharwa AI and support — models, app lifecycle and support-lock state machines, WhatsApp template and session flows, webhooks and signing, the 19 API tests by name.
- `docs/architecture/91-legacy-surfaces.md` (DOC-527): nine legacy-only features (LF-01 → LF-09), the 352 legacy page routes grouped by the 16 domains with their API successors, public-schema surfaces, the 17 Django admin actions, the shared-service table and a deprecation-policy recommendation.

**Changed (audit fixes to GLM's pages)**
- `09-b2b.md`: removed "planned" labels, added the B2B session-gate discrepancy (OI-10 / `30-security.md` §4.4), links to the registers; English text no longer wrapped in «».
- `10-…`, `11-shipping.md`, `12-…`: `§8.1 Tests` added with real `def test_` counts and discrepancies; nested «» removed; wrong line references corrected (`:507` → `:505`, `smsa.py:1-40` → `1-38`); generated routing-rule name described correctly.
- `10`, `11`, `16`: four Mermaid diagrams did not parse (invalid dotted ER relationships, `;` inside sequence-diagram messages) and were fixed — all 37 diagrams of pages 09–16 now render.
- `15-reports.md`: the "Code" line lists the real files. `16-platform-console.md`: Arabic quotes made verbatim, `tenants/admin.py:355-362`.
- `90-open-items.md`: Arabic moved inside «…» with a quotation convention; SMSA text extracted from a code span. `92-inconsistencies.md`: KI-02 changed from "open, no scheduled deletion" to scheduled (flagged deprecated by DOC-462, deleted in Step 52).
- `docs/architecture/data-model/README.md`: rows 09 → 16 now "written (Step 50)".
- `specs/003-documentation/documentation-roadmap.md`: ticks + Status lines for the 11 tasks; status line (520 / 536, Step 50 added, next step 51).
- `specs/003-documentation/execution-plan.md`: the Step 50 output column uses the roadmap file names.

**Discrepancies found — roadmap vs code** (each a `⚠️ Discrepancy` call-out in its page)
1. Test counts: locations 7 not 8; courier 5 not 6; `sharwa_ship` 6 not 7; four legacy supplier suites not three; the staff "101 including legacy" figure cannot be reproduced; Domain 13 has 56 API + 526 legacy tests (254 dropshipping legacy tests and 5 in `test_staff_pos.py` are missing from the roadmap); Domain 14 has 19, as stated.
2. DOC-489: the B2B draft routes are gated by `check_merchant` and the session flag, not by the permission codes the roadmap names for staff (OI-10).
3. DOC-493: the channel models come from migrations 0187 → 0191, not 0231; two FEED_FIELDS lists exist (26 keys on the model, 20 in the contract); two of the four legacy POS write views bypass `pos_service`; the receipt number is zero-padded; booking holds are not released at expiry (17 call-outs in all).
4. DOC-494: only `notify_sharwaconnect_of_order_event` is a live outgoing WhatsApp path; `install_app` has no suspension check; `suspension_reason` is always null; `TEMPLATE_REGISTRY` has twelve keys, not six; six session states map to Arabic messages, not five; redaction matches eleven alternatives (12 call-outs in all).
5. DOC-527: "live stock check at checkout" is not legacy-only — `preflight_supplier_stock` is shared by the legacy and the JSON checkout; "both surfaces call the same services" holds for most areas, only partly for inventory and not at all for locations.
6. DOC-528: KI-02 was recorded as unscheduled although DOC-462 had flagged the route and scheduled the deletion for Step 52.

**Left open**: no Django or Jest test was run and no screen was opened; the line-number references were range-checked by script and a sample confirmed by hand, not all one by one; the dropshipping pricing and live-stock API wiring (`storefront_checkout_service` caller) lives in a module that was not among the staged files; the absence of any consumer of `bff/account/stores` was not re-grepped over the whole `src/` tree because no shell on the device was available.

## 2026-10-29 — Official Step 49 · M-5 P3 modules · 2.14 Sales channels manuals (part B: POS, bookings) (DOC-409 → 417)

**Verified first**: the Step 49 row of `execution-plan.md` reads Milestone **M-5**, subsection "2.14 Sales channels manuals (part B: POS, bookings)", DOC-409 → 417, 9 tasks, `13-*` guides (Track 2 — Arabic, RTL). The directive's `.speckit/003-documentation` path does not exist; the real spec folder is `specs/003-documentation`. The range also holds DOC-409/410 (dropshipping feeds and supplier orders/jobs) although the section label says "POS, bookings". The device shell was unavailable: files were staged, written in the cloud workspace and committed back.
**Ticked**: DOC-409 → 417 (9 tasks). Roadmap status is now 509 / 536; next is official Step 50 (3.6 Data model Domains 9–16 + 3.13 Open items register, DOC-489 → 496 and DOC-526 → 528).
**Sources verified against code**: dropshipping — `src/features/dropshipping/**`, `products/services/suppliers/*` (feed reader, mapping, approval, scheduling), `api/views_dropshipping.py`, `products/models/suppliers_dropship.py`, `src/mocks/dropshipping/state.ts`; POS — `src/features/pos/**` (open shift, sell, receipts, drawer, close shift, shift guard, pos frame), `products/services/pos_service.py`, `api/views_pos.py`, `products/models/staff_pos.py`, `src/mocks/pos/state.ts`, force-close facts from `docs/api/domains/13-channels-operations/m16-pos.md` §11; bookings — `src/features/bookings/**`, `products/services/booking_service.py`, `api/views_bookings.py`, `src/mocks/bookings/state.ts`, the sidebar entry in `navigation.ts`.

**Added** (Arabic, RTL, from `docs/_templates/guide-page.md`)
- `docs/guides/merchant/13-channels-operations/dropshipping-feeds.md` (DOC-409), `dropshipping-orders-jobs.md` (DOC-410).
- `docs/guides/merchant/13-channels-operations/pos-open-shift.md` (DOC-411), `pos-sell.md` (DOC-412), `pos-discounts.md` (DOC-413), `pos-refunds.md` (DOC-414), `pos-close-shift.md` (DOC-415).
- `docs/guides/merchant/13-channels-operations/bookings-services.md` (DOC-416), `bookings-slots.md` (DOC-417).

**Changed**
- `docs/guides/merchant/13-channels-operations/README.md`: DOC-409 → 417 now linked, Arabic titles, «مكتوبة (الخطوة 49)».
- `docs/guides/_assets/shots.json`: 23 `merchant/13-channels-operations` entries registered (238 → 261; POS shots replay the open-shift steps because the mock state is per run); `docs/guides/_screenshots.md` §7: the 23 rows and a Step-49 "registered but NOT captured" note.
- `specs/003-documentation/documentation-roadmap.md`: ticks + Status lines for the 9 tasks; status line (509 / 536, Step 49 added to the complete and screenshots-pending lists, next step 50).

**Discrepancies found — roadmap vs code** (each an HTML `⚠️ Discrepancy` comment in its page; the reader-facing ones also shown as «قيد معروف»)
1. DOC-409: the Next.js wizard always uses the model defaults — delimiter and encoding auto, major price unit, currency SAR, no auto-import — and feeds have no delete or disable although at most 20 active feeds are allowed; the preview titled «بعد التحويل» shows raw cell values; the errors CSV has two shapes.
2. DOC-410: the jobs page has no «النوع» filter; the old-screens-only features (address correction, poll now, cancel at supplier, cost-rise alerts, feed delimiter/encoding options, per-product pricing rules) are listed as a known limit.
3. DOC-411: the empty state says «أضفها من المواقع» but no screen creates, renames or disables a cash register (the locations editor only toggles «نقطة بيع»); the dashboard sidebar has no POS entry, so `/pos` is typed on the store host.
4. DOC-412: the receipt number is zero-padded (`POS-0012-003`), not `POS-<shift>-<seq>` as the roadmap writes it.
5. DOC-413: `set_pos_manager_code` is a Django management command with no Next.js screen or BFF route and is not in the staged sources, so the page says to ask Sharwa support and does not name it; `discount_exceeds_limit` is a machine code the cashier never sees; the DEBUG test code is deliberately not published; the manager who types the code is not recorded on the approval.
6. DOC-414: the refund-code threshold (default 200) has no screen; the success toast «سُجِّل الاسترجاع في درج الكاش.» also appears for Sharwa Pay receipts, which add no drawer movement; the refund is money-only (stock is not claimed).
7. DOC-415: the screen shows the variance as actual − expected (shortage negative) while the DB field and the «عجز وردية» approval keep expected − actual; rejecting a shortage also closes the shift; neither the close form nor the device panel offers a justification note although the API accepts one.
8. DOC-416: no booking permission key exists (any member who sees the module uses it); windows disabled in the old screens are not shown and not touched; "products show as not bookable when the feature is off" is a route gate (buyer routes answer 403), not a product flag; screen and API word the feature-off message differently.
9. DOC-417: the roadmap's "slot list with a date range" is a week/day calendar with arrow navigation; the cancel API also accepts a `held` slot but the screen offers it for `booked` only.

**Left open**: the 23 screenshots are registered, not captured (no shell on the device); no screen was opened in a browser; no Django test or mock E2E script was run; the 02-dashboard-shell, 04-orders-returns, 10-inventory-locations-procurement and 12-settings-staff-integrations link targets were confirmed on the device, not in the staged copy.

## 2026-10-29 — Official Step 48 · M-5 P3 modules · 2.14 Sales channels manuals (part A: inbox, channels, marketplaces, dropshipping) (DOC-398 → 408)

**Verified first**: the Step 48 row of `execution-plan.md` reads Milestone **M-5**, subsection "2.14 Sales channels manuals (part A: inbox, channels, marketplaces, dropshipping)", DOC-398 → 408, 11 tasks, `13-*` guides (Track 2 — Arabic, RTL). The directive's `.speckit/003-documentation` path does not exist; the real spec folder is `specs/003-documentation`. Output paths come from the roadmap tasks (`docs/guides/merchant/13-channels-operations/`), not from the directive's `13-communications` example. The device shell was unavailable: files were staged, written in the cloud workspace and committed back.
**Ticked**: DOC-398 → 408 (11 tasks). Roadmap status is now 500 / 536; next is official Step 49 (2.14 Sales channels manuals part B, DOC-409 → 417 per the plan — note the range also holds DOC-409/410, the dropshipping feeds and supplier orders/jobs pages, before POS and bookings).
**Sources verified against code**: inbox — `src/features/inbox/**` (screen, list, thread, reply box, context panel, convert dialog, schemas), `products/services/social_channels/{inbox_api_service,chat_to_order_service}.py`, `products/services/notification_service.py`; channels — `src/features/channels/**`, `products/services/social_channels/{channels_api_service,catalog_sync_service}.py`, `api/views_channels.py`; marketplaces — `src/features/marketplaces/**`, `products/services/marketplaces/{api_service,listing_service,bulk_sync_service}.py`, adapters' identifier types, `api/views_marketplaces.py`; dropshipping — `src/features/dropshipping/**`, `products/services/suppliers/{api_service,registry,pricing_engine,pricing_service,import_service}.py`, `api/views_dropshipping.py`; permission seeds `products/migrations/0186`, `0194`, `0200`; navigation `src/features/dashboard-shell/navigation.ts`; fixture ids from `src/mocks/{inbox,marketplaces,dropshipping}/state.ts`.

**Added** (Arabic, RTL, from `docs/_templates/guide-page.md`)
- `docs/guides/merchant/13-channels-operations/inbox.md` (DOC-398), `chat-to-order.md` (DOC-399), `connect-channels.md` (DOC-400), `keywords-templates-access.md` (DOC-401), `catalog-sync.md` (DOC-402).
- `docs/guides/merchant/13-channels-operations/marketplaces-connect.md` (DOC-403), `marketplaces-listings.md` (DOC-404), `marketplaces-jobs-orders.md` (DOC-405).
- `docs/guides/merchant/13-channels-operations/dropshipping-suppliers.md` (DOC-406), `dropshipping-catalog.md` (DOC-407), `dropshipping-pricing.md` (DOC-408).

**Changed**
- `docs/guides/merchant/13-channels-operations/README.md`: the Step-01 stub becomes «الصفحات» with a «الحالة» column — DOC-398 → 408 «مكتوبة (الخطوة 48)», DOC-409 → 417 «مخطَّطة» (no longer linked, the files do not exist yet).
- `docs/guides/_assets/shots.json`: 23 `merchant/13-channels-operations` entries registered (215 → 238); `docs/guides/_screenshots.md` §7: the 23 rows and a Step-48 "registered but NOT captured" note.
- `specs/003-documentation/documentation-roadmap.md`: ticks + Status lines for the 11 tasks; status line (500 / 536, Step 48 added to the complete and screenshots-pending lists, next step 49).

**Discrepancies found — roadmap vs code** (7, each an HTML `⚠️ Discrepancy` comment in its page; two also shown to readers as «قيد معروف»)
1. DOC-398: WhatsApp conversations appear in the inbox, but the empty state names only Facebook, Instagram, TikTok and Telegram (`inbox-screen.tsx:76`).
2. DOC-399: the convert dialog says «… يحسب الخادم الإجمالي ورسوم التوصيل.» but the chat order's total is the item subtotal, no delivery fee (`chat_to_order_service.py`); the roadmap's "reserved" stock is a direct decrement. «قيد معروف» in `chat-to-order.md`.
3. DOC-400: the task names WhatsApp, but the channels page has only Meta, TikTok Shop and Telegram (`CONNECTIONS`); WhatsApp is connected through the WhatsApp app. The owner-only sentence also differs: screen «إعدادات قنوات التواصل لمالك المتجر فقط.» vs API «إعدادات القنوات لمالك المتجر فقط.».
4. DOC-405: the roadmap's «إعادة تأكيد الشحنة» button reads «إعادة تأكيد» on screen (`orders-screen.tsx:136`).
5. DOC-406: Knawat is «كنوات» on screen (`schemas.ts:6`) but «قنوات» in the roadmap and Django's supplier registry (server messages use the registry name); flat feed «ملف مسطّح» vs «ملف أو رابط كتالوج».
6. DOC-408: "products with a supplier fixed price are locked" — the lock is a manual price edit or a feed sale price (`pricing_service.is_price_locked`, `import_service`), with no unlock action in the dashboard. «قيد معروف» in `dropshipping-pricing.md`.
7. DOC-408: a «ثابت» FX rate multiplies the supplier cost whatever its currency, SAR included (`pricing_engine.to_sar`) — documented as a warning.
Not a discrepancy, documented as the roadmap asks: the Meta catalog-sync limitation «لا يوجد ربط تصنيف لهذا المنتج على هذه القناة.» («قيد معروف» in `catalog-sync.md`).

**Left open**: the 23 screenshots are registered, not captured (no shell on the device); no screen was opened in a browser; no Django test or mock E2E script was run.

## 2026-10-29 — Official Step 47 · M-5 P3 modules · 2.9 B2B + 2.15 Apps/AI/support + 2.17 Sharwa Pay manuals (DOC-357 → 358, DOC-418 → 424, DOC-428 → 430)

**Verified first**: the Step 47 row of `execution-plan.md` reads Milestone **M-5**, subsection "2.9 B2B + 2.15 Apps/AI/support + 2.17 Sharwa Pay manuals", DOC-357 → 358, DOC-418 → 424, DOC-428 → 430, 12 tasks (Track 2 — Arabic, RTL). The directive's `.speckit/003-documentation` path does not exist; the real spec folder is `specs/003-documentation`. The directive's example folders (`docs/guides/09-b2b/` …) differ from the roadmap; the roadmap Output paths were used (`docs/guides/merchant/09-b2b/`, `docs/guides/merchant/14-apps-ai-support/`, `docs/guides/sharwa-pay/08-finance/`). Only the three roadmap blocks were read, with `docs/README.md` §5, `docs/guides/_style-guide.md`, `_glossary.md`, `_screenshots.md`, `docs/_templates/guide-page.md` and finished guides for house style.
**Ticked**: DOC-357, 358, 418 → 424, 428 → 430 (12 tasks). Roadmap status is now 489 / 536; next is official Step 48 (2.14 Sales channels manuals part A, DOC-398 → 408).
**Sources verified against code**: B2B — `src/features/b2b/**` (form, drafts screen, schemas), `api/views.py` draft views + `products/services/b2b_api_service.py`, permission seeds `products/migrations/0159`; Apps/AI/support — `src/features/apps/**` (catalogue, app page, WhatsApp panel/usage/templates, Sharwa AI screen), `src/features/support/**` (sessions, tickets), `products/services/{apps_api_service,template_service,sharwa_ai_api_service,sharwa_ai_sso,support_api_service,support_lock_service}.py`, `api/views_{apps,sharwa_ai,support}.py`, permission seed `0182`, `navigation.ts` + `sidebar.tsx` (menu placement and gating); Sharwa Pay — `src/features/sharwa-pay/**` (login, wallet, transactions, requests, top-up and withdrawal forms, shell), `sharwapay/customer_api.py` (limits, messages, wallet creation), `src/mocks/sharwa-pay/state.ts` (mock OTP). All 498 distinct «…» quotations across the 12 pages were machine-checked against the `sharwa_saas` + `src` corpora: every one matches verbatim or as the rendered form of a template string (variable parts written «…(وصف)…» per the style guide); the two permission labels were confirmed in their seed migrations. The check caught two content errors before publishing (sign-in said the wallet is created on the first *approved* top-up — `create_topup` creates it with the first request; the templates page said saving an empty editor restores the default — the required-variable check refuses it, only «استعادة النص الافتراضي» does).

**Added** (Arabic, RTL, from `docs/_templates/guide-page.md`)
- `docs/guides/merchant/09-b2b/create-draft.md` (DOC-357), `approve-drafts.md` (DOC-358).
- `docs/guides/merchant/14-apps-ai-support/app-store.md` (DOC-418), `whatsapp-app.md` (DOC-419), `whatsapp-templates.md` (DOC-420), `sharwa-ai-pairing.md` (DOC-421), `sharwa-ai-settings-console.md` (DOC-422), `support-sessions.md` (DOC-423), `support-tickets.md` (DOC-424).
- `docs/guides/sharwa-pay/08-finance/sign-in.md` (DOC-428), `wallet-and-transactions.md` (DOC-429), `topup-and-withdraw.md` (DOC-430).

**Changed**
- `docs/guides/merchant/09-b2b/README.md`, `docs/guides/merchant/14-apps-ai-support/README.md`, `docs/guides/sharwa-pay/08-finance/README.md`: «الصفحات» with a «الحالة» column — every page «مكتوبة (الخطوة 47)».
- `docs/guides/_assets/shots.json`: 24 entries registered (3 `merchant/09-b2b`, 14 `merchant/14-apps-ai-support`, 7 `sharwa-pay/08-finance` on the platform origin, mobile); `docs/guides/_screenshots.md` §7: the 24 rows and a Step-47 "registered but NOT captured" note.
- `specs/003-documentation/documentation-roadmap.md`: ticks + Status lines for the 12 tasks; status line (489 / 536, Step 47 added to the complete and screenshots-pending lists, next step 48).

**Discrepancies found — roadmap vs code** (4, each an HTML `⚠️ Discrepancy` comment in its page, two also shown to readers as «قيد معروف»)
1. DOC-419: the roadmap asks for the WhatsApp "connection status"; the panel shows none — `connect-url/` returns `{url, connected}` but the screen only opens the link (`whatsapp-screens.tsx` `openConnect`). «قيد معروف» in `whatsapp-app.md`.
2. DOC-422: the roadmap names the console button «فتح لوحة الذكاء»; the code says «افتح وحدة تحكم شروة AI» (`sharwa-ai-screen.tsx`). The page quotes the code.
3. DOC-423: the roadmap gives every member read access to support sessions; the sidebar group «مركز الدعم» has one item gated on `support.takeover_session`, so read-only members lose the menu entry (`navigation.ts`, `sidebar.tsx` group filter) although the screen reads for everyone. «قيد معروف» in `support-sessions.md`.
4. DOC-429: the roadmap (and the dashboard's own currency labels) say YER Sanaa / Aden; the Sharwa Pay wallet labels `YER_OLD`/`YER_NEW` «ريال يمني (قديم)» / «ريال يمني (جديد)» (`src/features/sharwa-pay/schemas.ts:11`). The page quotes the wallet and explains the mapping.
Carried, not new: tickets sit under «محفظة المتجر» in the sidebar (reported in Step 10, `plan-features.md`) — repeated as a «قيد معروف» in `support-tickets.md`.

**Left open**: the 24 screenshots are registered, not captured (no shell on the device); no screen was opened in a browser; no Django test or mock E2E script was run.

## 2026-10-29 — Audit of official Step 46 · M-5 P3 modules · 1.18 Domain 13 API (part C: POS, bookings) (DOC-243 → DOC-252)

**Scope**: independent audit of the Step 46 execution — `docs/api/domains/13-channels-operations/m16-pos.md` (DOC-243 → 248, completing the Step 45 part-1 page) and `m26-bookings.md` (DOC-249 → 252, new) — against the Step 46 row of `execution-plan.md`, the DOC-243 → 252 task blocks of `### 1.18` and `docs/_templates/api-endpoint.md`. Documentation only; no application code touched, nothing committed.
**Checked**: (a) both pages sit at their tasks' Output paths in `docs/api/domains/13-channels-operations/`; (b) both carry the template header block (Source · Live key · Django provider · Frontend contract · Tests · Last verified) and keep the template's section order with one numbered section per endpoint group (M16 §4–§11 incl. the DOC-248 force-close/migrations/wiring section, M26 §4–§7), then Open items and Related pages; the Step 45 "part 1" placeholders are gone (the M16 route table now points every row at its section); no template comments or placeholders; both Mermaid diagrams (the refund `428 → OTP → retry` sequence and the hold-lifecycle state diagram) render with `mmdc`; all links and the roadmap Status-line anchors resolve; (c) Track 1 English: Arabic appears only in «…» quotes, in JSON example bodies and in the template's Arabic module name in the H1; (d) all 107 «…» / JSON Arabic strings were compared with `products/services/{pos_service,booking_service,storefront_cart_service,storefront_checkout_service,checkout_service,staff_service,refund_service}.py`, `api/views_{pos,bookings}.py`, `products/views/bookings.py`, `products/models/{staff_pos,bookings,staff_approvals}.py`, `api/test_{pos,bookings}_api.py` and the frontend `src/features/{pos,bookings}/**`: every one matches verbatim, as the rendered form of a template string (e.g. «رمز التحقق غير صحيح. المتبقي 2 محاولتان.» = `test_pos_api.py:259`), or as a quoted fixed fragment of an f-string (the checkout expired-hold message); remaining misses are placeholders («<المنتج>», «<جهاز الكاش>») and the example branch «فرع صنعاء». The carried discrepancy holds: `api/urls.py:521-534` registers **14** POS routes. Roadmap: DOC-243 → 252 are `[x]` (477 `[x]` DOC tasks in total, matching `status:` 477 / 536, which already lists Step 46 as complete).
**Fixed**
- `m16-pos.md` §3 discrepancy callout: it named "the domain README" as a second source of the 15-route count, but no README says so — the second source is DOC-248's "the 15-route table"; and its pointer "see §6" for force-close now reads "see §11" (§6 is Shifts; force-close is documented in §11).
- `docs/api/domains/13-channels-operations/README.md`: Status column — `m16-pos.md` written (Steps 45 + 46), `m26-bookings.md` written (Step 46); all five Domain 13 pages are now written.
**Not changed**: `m26-bookings.md`; roadmap ticks, Status lines and `status:` (already correct).
**Left open**: no Django test or mock E2E script was run in this audit (read-only comparison with the code).

## 2026-10-29 — Official Step 46 · M-5 · 1.18 Domain 13 API (part C: POS, bookings) (DOC-243 → 252)

**Verified first**: the Step 46 row of `execution-plan.md` reads Milestone **M-5**, subsection "1.18 Domain 13 API (part C: POS, bookings)", DOC-243 → 252, 10 tasks, outputs `m16-pos.md`, `m26-bookings.md` (Track 1 — English). The directive's `.speckit/003-documentation` path does not exist; the real spec folder is `specs/003-documentation`.
**Ticked**: DOC-243 → DOC-252 (10 tasks). Roadmap status is now 477 / 536; next is official Step 47 (2.9 B2B + 2.15 Apps/AI/support + 2.17 Sharwa Pay manuals, DOC-357 → 358, DOC-418 → 424, DOC-428 → 430).
**Sources verified against code**: `products/services/pos_service.py` (whole file — shifts, movements, close/variance, search/quote/sale, discount approvals, manager code, refund + OTP), `api/views_pos.py`, migration `products/0229_pos_api`, `billing/0013_seed_pos_feature`, `products/tasks/operations.py` (force-close, `SHIFT_MAX_DURATION_HOURS = 12`, Beat */30), `StoreSetting.pos_refund_otp_threshold`/`pos_manager_code_hash`, `api/test_pos_api.py` (17); `products/services/booking_service.py` (whole file), `api/views_bookings.py` (6 routes) + `api/urls.py:81-82,559-562`, the cart/checkout integration (`storefront_cart_service.py`, `storefront_checkout_service.py:125-150` incl. the buy-now `409 {detail, changed}` shape, `checkout_service.py` slot locking + the expired-hold message), `products/views/bookings.py` (`require_feature` fix), `api/test_bookings_api.py` (9), both BFF routes. All 93 distinct «…»/JSON Arabic strings across the two pages were machine-checked against the source corpus — PASS after fixing two renderings (the OTP count word is a runtime variable, so the fixed prefix + the test's rendered form are quoted; the checkout expired-hold message is quoted as its two literal fragments around the f-string date).

**Added** (English, from `docs/_templates/api-endpoint.md`)
- `docs/api/domains/13-channels-operations/m26-bookings.md` (DOC-249 → 252): services + availability (weekday convention 0 = Monday, full-replacement PUT with per-row errors, paused windows untouched, no M18 key), the merchant calendar (store-zone bounds, inclusive `to`, computed `is_expired`, «زائر المتجر») and cancellation (`order_effect`, `AuditLog`), the buyer slot response + the five-step slot-generation algorithm, the hold contract (15 min, session-bound, `release_slot_id`, the `400/409/429` table, IntegrityError race), the hold-lifecycle Mermaid state diagram, all five INT-036 bug fixes, the cart/buy-now/checkout integration and the wiring/tests.
- `m16-pos.md` was completed with §6–§11 (DOC-243 → 248): the open-shift outcome table, movements/close/resolve-variance with the sign-convention callout and both settlement paths, search/quote/sale (M06 order, receipt numbering, `discount_allocated`, stock/serialized/Sharwa-Pay side effects, the idempotency contract), the discount decision table (manager code + approvals queue), the refund OTP flow with a Mermaid sequence diagram, and force-close/migration 0229/BFF/tests.

**Changed**
- `specs/003-documentation/documentation-roadmap.md`: ticks + Status lines for the 10 tasks; status line (477 / 536, next step 47).

**Discrepancies found — roadmap vs code**: none new. The carried one (DOC-242/248 count 15 POS routes; `api/urls.py` registers 14 — force-close is a Celery transition, not an HTTP route) remains flagged in `m16-pos.md` §3 and is referenced in DOC-248's Status line.

## 2026-10-29 — Audit of official Step 45 · M-5 P3 modules · 1.18 Domain 13 API (part B: marketplaces, dropshipping) (DOC-233 → DOC-242)

**Scope**: independent audit of the Step 45 execution — `docs/api/domains/13-channels-operations/m28-marketplaces.md` (DOC-233, DOC-234 appended to part A), `m29-dropshipping.md` (DOC-235 → 241, new) and `m16-pos.md` (DOC-242, new part-1 page — the roadmap Output of the range's last task) — against the Step 45 row of `execution-plan.md`, the DOC-233 → 242 task blocks of `### 1.18` and `docs/_templates/api-endpoint.md`. Documentation only; no application code touched, nothing committed.
**Checked**: (a) every task's section sits on its roadmap Output page in `docs/api/domains/13-channels-operations/` — DOC-242 went to `m16-pos.md`, not to the M28/M29 pages; (b) all three pages carry the template header block (Source · Live key · Django provider · Frontend contract · Tests · Last verified) and keep the template's section order, with one numbered section per endpoint group (M28 §4–§7, M29 §4–§9, M16 §4–§5) before Gaps/wiring, Open items and Related pages; `m16-pos.md` has no "Gaps closed / migrations" section yet — its migration `billing/0013_seed_pos_feature` is covered in §2 and the section belongs to DOC-248 (Step 46); no template comments or placeholders; the M28 Mermaid diagram renders; all links and the roadmap Status-line anchors resolve; (c) Track 1 English, except five bare Arabic words fixed below; (d) all 154 «…» / JSON Arabic strings were compared with `products/services/{marketplaces,suppliers}/**`, `products/services/pos_service.py`, `api/views_{marketplaces,dropshipping,pos}.py`, `products/models/{marketplaces,suppliers_dropship,staff_pos}.py`, the legacy dropshipping views and the frontend `src/features/{marketplaces,dropshipping,pos}/**`: every one matches verbatim or as the rendered form of a template string (`f'قيمة {id_type.upper()} غير صالحة.'`, ``أدخل «<التسمية>».``); remaining JSON values such as «فرع صنعاء» are example data. The executor's one discrepancy holds: `api/urls.py:521-534` registers **14** POS routes, not 15. Roadmap: DOC-233 → 242 are `[x]` (467 `[x]` DOC tasks in total, matching `status:` 467 / 536, which already lists Step 45 as complete).
**Fixed**
- `m29-dropshipping.md`: the supplier names مخازن and قنوات appeared bare in English prose (header, §1, §4.1, §5.3, §11); now quoted as the registry display names «مخازن» / «قنوات», with their codes `makhazen` / `knawat` where helpful.
- `m28-marketplaces.md` §6.3: the CSV column name «الحالة» was bare Arabic (`الحالة «خطأ»`); now «الحالة» = «خطأ».
- `docs/api/domains/13-channels-operations/README.md`: Status column updated — `m28-marketplaces.md` written (Steps 44 + 45), `m29-dropshipping.md` written (Step 45), `m16-pos.md` part 1 written (Step 45: DOC-242; DOC-243 → 248 in Step 46).
**Not changed**: `m16-pos.md`; roadmap ticks, Status lines and `status:` (already correct).
**Left open**: no Django test, legacy `phase*` suite or mock E2E script was run in this audit (read-only comparison with the code).

## 2026-10-29 — Official Step 45 · M-5 · 1.18 Domain 13 API (part B: marketplaces, dropshipping) (DOC-233 → 242)

**Verified first**: the Step 45 row of `execution-plan.md` reads Milestone **M-5**, subsection "1.18 Domain 13 API (part B: marketplaces, dropshipping)", DOC-233 → 242, 10 tasks, outputs `m28-marketplaces.md`, `m29-dropshipping.md` (Track 1 — English). The range's last task DOC-242 is the first POS task and opens `m16-pos.md` (its own roadmap Output); DOC-243 → 248 stay with Step 46. The directive's `.speckit/003-documentation` path does not exist; the real spec folder is `specs/003-documentation` (known since Step 41).
**Ticked**: DOC-233 → DOC-242 (10 tasks). Roadmap status is now 467 / 536; next is official Step 46 (1.18 Domain 13 API part C: POS, bookings, DOC-243 → 252).
**Sources verified against code**: M28 — `bulk_sync_service.py` (CSV header, `BULK_FEED_THRESHOLD = 20`, `active_push_job`), `order_pull_service.py` / `fba_inventory_service.py` (start functions, `STALE_JOB_MINUTES = 30`), `shipment_confirm_service.py` (`retry_failed_confirmation`), `tasks/marketplaces.py` (`MARKETPLACE_QUEUE_MAP`, enqueue helpers), adapter capability flags, the 5 legacy `test_marketplaces_phase*` suites, `scripts/marketplaces-check.ts`. M29 — `products/services/suppliers/api_service.py` (whole file), `views_dropshipping.py` (27 routes) + `api/urls.py:604-630`, `registry.py` (4 suppliers, credential fields), `pricing_engine.py` / `pricing_service.py` (formula, `RuleBook.select`, reprice job), `feed_engine.py` / `import_service.py` (new feed fields, `MAX_IMPORT_BATCH = 500`, price≥cost + lock), `models/suppliers_dropship.py` (interval constants, `ATTENTION_STATUSES`, `MAX_FEEDS`), `tasks/suppliers.py` (Beat cadences, `_due_price_sync` baseline), migration `0232_dropshipping_api`, `api/test_dropshipping_api.py` (11), the BFF catch-all, `scripts/dropshipping-check.ts`. M16 — `pos_service.py` (gates/Actor/context/registers), `views_pos.py`, `api/urls.py:521-534`, `billing/migrations/0013_seed_pos_feature`, the POS BFF. All 129 distinct «…»/JSON Arabic strings across the three pages were machine-checked against the source corpus.

**Added** (English, from `docs/_templates/api-endpoint.md`)
- `docs/api/domains/13-channels-operations/m29-dropshipping.md` (DOC-235 → 241): the 27-route table; supplier rows with capability flags and registry-rendered credential fields; connect (adapter-first, 400/429/502), settings bounds and «إحالة الطلبات»; inventory sync, one-time webhook rotation, the CJ live catalogue with `ext:<pid>` ids and the computed `importing` state, import batches; the pricing engine formula, the contract⇄model translation with the priority inversion (`1000 − priority`) and simulation/apply; the full 20-key feed mapping table, the feed status machine, approve-vs-run, the link-only schedule; supplier orders + the HTML-only legacy callout; the job type mapping, per-type retry table and the Beat machinery; migration 0232, BFF wiring and tests.
- `docs/api/domains/13-channels-operations/m16-pos.md` (DOC-242, part 1 — DOC-243 → 248 in Step 46): the 4-gate chain (incl. `code: "feature_disabled"` and the approver roles), the `Feature(pos, requires_plan=True)` seeding and subscriptions-off note, the route table, cashier context (ceiling, permission flags, force-close notice) and register filtering.

**Changed**
- `docs/api/domains/13-channels-operations/m28-marketplaces.md`: part A completed with §6 (push NO-ID/Feeds/per-listing split, trigger 409s + stale takeover, job view + errors CSV with its Arabic headers) and §7 (order rows, the confirmation-status mapping table, re-confirmation 409s); header, route table and wiring/test sections updated to DOC-231…234.
- `specs/003-documentation/documentation-roadmap.md`: ticks + Status lines for the 10 tasks; status line (467 / 536, next step 46).

**Discrepancies found — roadmap vs code**: one. DOC-242 counts **15** POS routes; `api/urls.py:521-534` registers **14** — force-close is a Celery transition surfaced only through `pos/context/`'s `force_closed_notice`, not an HTTP route. Flagged as a ⚠️ callout in `m16-pos.md` §3 and in the task's Status line. (The quote gate also caught and fixed one true misquote before publishing: «أدخل رقم التتبع ليُؤكَّد الشحن للسوق آلياً.» needs the tanwin on «آلياً».)

## 2026-10-29 — Audit of official Step 44 · M-5 P3 modules · 1.18 Domain 13 API (part A: inbox & channels) (DOC-222 → DOC-232)

**Scope**: independent audit of the Step 44 execution — `docs/api/domains/13-channels-operations/m27-inbox-channels.md` (DOC-222 → 230) and `m28-marketplaces.md` (DOC-231 → 232, part A; the roadmap sends these two tasks to the M28 page) — against the Step 44 row of `execution-plan.md`, the DOC-222 → 232 task blocks of `### 1.18` and `docs/_templates/api-endpoint.md`. Documentation only; no application code touched, nothing committed.
**Checked**: (a) both pages sit at their tasks' Output paths in `docs/api/domains/13-channels-operations/`; (b) both carry the template header block (Source · Live key · Django provider · Frontend contract · Tests · Last verified) and keep the template's section order — the endpoint groups are split into two numbered sections (M27 §4 Inbox / §5 Channels; M28 §4 Connections / §5 Listings), as the template allows ("repeat §4 per group"), so Gaps / Open items / Related pages are §6–§8; no template comments or placeholders; all 3 Mermaid diagrams render with `mmdc`; all in-page and cross-page links resolve; (c) Track 1 English: Arabic appears only in «…» quotes, in JSON example bodies and in the template's Arabic module name in the H1; (d) all 112 «…» / JSON Arabic strings were compared with `products/services/social_channels/**`, `products/services/marketplaces/**`, `api/views_{channels,marketplaces}.py`, `products/views/{social_channels_connect,marketplaces_connect}.py`, `products/models/social_channels_inbox.py`, `products/tasks/channels.py` and the frontend `src/features/{inbox,channels,marketplaces}/**`: every one matches verbatim or as the rendered form of a template string (e.g. «قيمة EAN غير صالحة.» from `f'قيمة {id_type.upper()} غير صالحة.'`); roadmap: DOC-222 → 232 are `[x]` (457 `[x]` DOC tasks in total, matching `status:` 457 / 536, which already lists Step 44 as complete).
**Fixed**
- `specs/003-documentation/documentation-roadmap.md`: the Status lines of DOC-222 → 232 cited 16 section anchors that do not exist (e.g. `#2-access-gate-chain`, `#41-counters-and-conversation-list-doc-223`) — GitHub slugs the em dash in "2. Access — gate chain" to a double hyphen. Each citation now uses the real slug (`#2-access--gate-chain`, `#41-counters-and-conversation-list--doc-223`, …). No tick or status change.
- `docs/api/domains/13-channels-operations/README.md`: still the Step 01 stub ("planned pages", no status); now «Pages» with a Status column — `m27-inbox-channels.md` written (Step 44), `m28-marketplaces.md` part A written (Step 44: DOC-231, DOC-232; DOC-233, DOC-234 in Step 45), the other three planned — matching the Domain 14 and 16 indexes.
**Not changed**: `m27-inbox-channels.md` and `m28-marketplaces.md` (no defect found); roadmap ticks and `status:`.
**Left open**: no Django test, legacy `phase*` suite or mock E2E script was run in this audit (read-only comparison with the code).

## 2026-10-28 — Official Step 44 · M-5 · 1.18 Domain 13 API (part A: inbox & channels) (DOC-222 → 232)

**Verified first**: the Step 44 row of `execution-plan.md` reads Milestone **M-5**, subsection "1.18 Domain 13 API (part A: inbox & channels)", DOC-222 → 232, 11 tasks, output `13-*/m27-inbox-channels.md` (Track 1 — English). The directive's path `.speckit/003-documentation` does not exist; the real spec folder is `specs/003-documentation` (known from Steps 41–43).
**Ticked**: DOC-222 → DOC-232 (11 tasks). Roadmap status is now 457 / 536; next is official Step 45 (1.18 Domain 13 API part B: marketplaces, dropshipping, DOC-233 → 242).
**Sources verified against code**: `products/services/social_channels/inbox_api_service.py` + `channels_api_service.py` + `chat_to_order_service.py` (whole files), `api/views_channels.py` (21 routes) and `api/urls.py:565-585`; `products/services/marketplaces/api_service.py` + `listing_service.py` (pricing/identifier functions) + `views_marketplaces.py` (14 routes) + `marketplaces_connect.py` (OAuth callback), `amazon_auth.py`, `noon_adapter.py` (`NOON_COUNTRIES`, fake switch), `signals_marketplaces.py` (auto_push meaning); migration `products/0231_inbox_api`; Celery `products/tasks/channels.py` (dispatch/sync/health, queues); tests `api/test_channels_api.py` (10) and `api/test_marketplaces_api.py` (9); BFF `api/bff/inbox/[...path]`, `api/bff/channels/[[...path]]`, `api/bff/marketplaces/[[...path]]`; `.env.example` (`channels`, `marketplaces`); frontend `src/features/inbox/schemas.ts` and `market-settings.tsx` labels. All 96 distinct «…»/"…" Arabic strings on the two pages were machine-checked against the source corpus — all match verbatim or as documented f-string instantiations/placeholders.

**Added** (English, from `docs/_templates/api-endpoint.md`)
- `docs/api/domains/13-channels-operations/m27-inbox-channels.md` (DOC-222 → 230): the 6-gate chain with every status/message and the `StaffChannelAccess` whitelist rules; the 21-route table; inbox counters/list/detail/picker with the UI ⇄ Django code-mapping table and the reopen rule; messages with the queued → sent | failed lifecycle diagram, `client_id` idempotency and product cards; chat-to-order with the currency/timeline fixes; channel list/Telegram/disconnect/OAuth-start with a no-open-redirect sequence diagram; keywords + the new `ChannelReplyTemplate`; catalog sync/product links/TikTok mapping with the Meta-mapping ⚠️ callout; the 4-row staff-access matrix; migration 0231, the Celery list, BFF wiring and the test inventory.
- `docs/api/domains/13-channels-operations/m28-marketplaces.md` (DOC-231 → 232, part A — push/jobs/CSV/orders sections follow with DOC-233/234 in Step 45): the 3-gate chain (permission **before** plan feature — reverse of M27, noted), the 14-route table, hub row, Amazon OAuth with amazon.sa auto-pin + sequence diagram, noon connect (seller id + country → currency, fake adapter switch), settings with `import_marketplace_fulfilled` and the real `auto_push` meaning, and listings with the lazy-materialization rule, the price formula and the identifier type/format table per adapter.

**Changed**
- `specs/003-documentation/documentation-roadmap.md`: ticks + Status lines for the 11 tasks; status line (457 / 536, next step 45).

**Discrepancies found — roadmap vs code**: none. All 11 tasks matched the code on every checked rule (21/14 route counts, the gate orders, migration 0231 fields, the 10+9 API tests, the eight legacy `phase*` suites, `SHARWA_LIVE_MODULES` keys). Two nuances recorded as page notes, not discrepancies: M28 checks the permission key before the plan feature (the roadmap's FR-28.01 listing happens to match the code order), and keyword uniqueness is case-insensitive via the service `iexact` check on top of the DB `unique=True`.

## 2026-10-28 — Audit of official Step 43 · M-5 P3 modules · 1.13 Domain 9 API + 1.19 Domain 14 API (DOC-164 → 168, DOC-253 → 262)

**Scope**: independent audit of the Step 43 execution — `docs/api/domains/09-b2b/README.md`, `m36-b2b-wholesale.md`, and `docs/api/domains/14-apps-ai-support/README.md`, `m30-app-store.md`, `m31-sharwa-ai.md`, `m32-support.md` — against the Step 43 row of `execution-plan.md`, the DOC-164 → 168 and DOC-253 → 262 task blocks of the roadmap and `docs/_templates/api-endpoint.md`. Documentation only; no application code touched, nothing committed.
**Checked**: (a) every page sits at its task's Output path; (b) the three module pages carry the template header block (Source · Live key · Django provider · Frontend contract · Tests · Last verified) and sections 1–7 in order, with no template comments or placeholders; the Domain 9 README is the overview page DOC-164 asks for; (c) Track 1 English: Arabic appears only in «…» quotes, in JSON example bodies and in the template's Arabic module name in the H1; (d) every Arabic message was compared with the Django services/views and the frontend screens and mocks (`src/features/{b2b,apps,support}/**`, `src/mocks/{b2b,apps,support}/**`): all match verbatim or as the rendered form of a template string; the one Mermaid diagram (`m31-sharwa-ai.md`) renders with `mmdc`; roadmap: the 15 tasks are `[x]` (446 `[x]` DOC tasks in total, matching `status:` 446 / 536, which already lists Step 43 as complete).
**Fixed**
- `09-b2b/m36-b2b-wholesale.md`: the roadmap Output anchors `#options`, `#tier-prices`, `#unit-price-precedence` and `#drafts` — also used by six links in `09-b2b/README.md` — did not resolve (the headings slug to `41-draft-form-choices--options` …); added an explicit `<a id="…"></a>` before each of the four §4 headings.
- `14-apps-ai-support/m30-app-store.md` §4.1: the link to the console apps page pointed at a non-existent anchor `#44-apps--overrides` via `../../domains/…`; now `../16-platform-console/m46-plans-billing.md#44-getpost-apps--patch-appscode--getpost-app-billing-overrides--delete-app-billing-overridesid`.
**Not changed**: roadmap ticks and `status:` (already correct); both domain READMEs.
**Observation (not fixed)**: some JSON example values (role «مشتريات», branches «الفرع الرئيسي» / «مستودع صنعاء», customer «متجر النور للتجزئة», staff «سامي», ticket «طلبي تأخر», app «تيليجرام») are illustrative and not literally present in the fixtures or Django tests; they are example data, not UI or server messages.
**Left open**: no Django test or mock E2E script was run in this audit (read-only comparison with the code).

## 2026-10-28 — Official Step 43 · M-5 P3 modules · 1.13 Domain 9 API + 1.19 Domain 14 API (DOC-164 → 168, DOC-253 → 262)

**Verified first**: the Step 43 row of `execution-plan.md` reads Milestone **M-5** (P3 modules), subsection "1.13 Domain 9 API + 1.19 Domain 14 API", DOC-164 → 168 and DOC-253 → 262, 15 tasks, outputs `09-b2b/` and `14-apps-ai-support/` (Track 1 — English). Only those two roadmap blocks were read, with `docs/README.md`, `docs/glossary.md` and `docs/_templates/api-endpoint.md`.
**Ticked**: DOC-164 → DOC-168 and DOC-253 → DOC-262 (15 tasks). Roadmap status is now 446 / 536; next is official Step 44 (1.18 Domain 13 API part A: inbox & channels, DOC-222 → 232).
**Sources verified against code**: Domain 9 — `products/services/b2b_api_service.py` + `api/views_b2b.py` (whole files), `products/services/tier_pricing.py`, the draft views `api/views.py:395-577`, `B2BDraftSerializer`, `api/test_b2b_api.py` (8 tests), the BFF (`api/bff/b2b/[[...path]]`, `B2B_LIVE_RULES` in `live-products.ts`, `.env.example`). Domain 14 — `products/services/apps_api_service.py` + `api/views_apps.py` (12 routes), `products/services/sharwa_ai_api_service.py` + `api/views_sharwa_ai.py` (4 routes), `products/services/sharwa_ai_sso.py`, `products/services/support_api_service.py` + `api/views_support.py` (11 routes) + `support_lock_service.py`, `template_service.TEMPLATE_REGISTRY`, migrations `products/0233_app_store_api` and `0234_support_api`, the three test files (7 + 6 + 6 tests), both BFF catch-alls, and the Next.js console handshake (`sharwa-ai-screen.tsx`). Every «…» sentence was machine-checked against the source corpus; the two non-literal hits are documented f-string instantiations.

**Added** (English, from `docs/_templates/api-endpoint.md`)
- `docs/api/domains/09-b2b/m36-b2b-wholesale.md` (DOC-165 → 168): draft-form options, tier-price CRUD with every verbatim message and the change-log trail, the shared `unit_price` precedence and its consumers, and the create/list/resolve draft contracts with all five INT-044 gaps closed.
- `docs/api/domains/14-apps-ai-support/m30-app-store.md` (DOC-253 → 256): the 12-route table, the `whatsapp` ⇄ `whatsapp_bot` translation, per-store billing preview rules, the lifecycle error matrix, the usage event mapping, the six-template table with all PATCH rules, connect-url, migration 0233 and legacy-only notes.
- `docs/api/domains/14-apps-ai-support/m31-sharwa-ai.md` (DOC-257 → 259): pairing status with the gateway-state → Arabic message table, the single `record_status` rule, bot settings bounds, and the RS256 console SSO with a Mermaid sequence diagram of the `sharwa-console-ready` / `sharwa-console-token` handshake.
- `docs/api/domains/14-apps-ai-support/m32-support.md` (DOC-260 → 262): the 11-route table, session list/timeline with the `2×id` scheme and dot-cursor, the server-side redaction list, the version-checked takeover/release/close and idempotent `client_id` replies, tickets CRUD with `closed_at`-follows-status, assignees, migration 0234.

**Changed**
- `docs/api/domains/09-b2b/README.md`: stub replaced by the Domain 9 overview (route table, switches, providers, the `NegotiationDraft` open item).
- `docs/api/domains/14-apps-ai-support/README.md`: stub header replaced; Status column added — all three pages marked written (Step 43).
- `specs/003-documentation/documentation-roadmap.md`: ticks + Status lines for the 15 tasks; status line (446 / 536, next step 44).

**Discrepancies found — roadmap vs code**: none. All 15 tasks matched the code on every checked rule, including the five INT-044 draft gaps, the 12/4/11 route counts, the event mapping table, the template ids 1–6, the SSO handshake, and the two migrations.

## 2026-10-28 — Audit of official Step 42 · M-4 Console · 2.18 Platform console manual (DOC-431 → DOC-443)

**Scope**: independent audit of the Step 42 execution — the 13 Track 2 pages under `docs/guides/console/16-platform-console/` plus the two index pages — against the Step 42 row of `execution-plan.md`, the DOC-431 → 443 task blocks of the roadmap and `docs/_templates/guide-page.md`. Documentation only; no application code touched, nothing committed.
**Checked**: (a) every page sits at its task's Output path (`docs/guides/console/16-platform-console/<page>.md`, one page per task); (b) each page opens with `<div dir="rtl">` + blank line and closes with `</div>`, carries the «المصدر» line and the «لمن هذه الصفحة؟» table, ends with «صفحات ذات صلة», and keeps the template's section order (task-specific step sections replace «الخطوات»/«الحقول» where the screen has several areas — the house style of the merchant guides); no template comments left; 20 screenshot placeholders follow `../../_assets/console/16-platform-console/<page>-<n>.png` with a `capture:` comment; (c) Arabic prose throughout — Latin appears only in code spans, routes, field names and DOC/INT ids; (d) all 607 «…» quotations were compared with `src/features/platform-admin/**` and the Django console services: every one matches the code verbatim or as the rendered form of a template string (values in place of `${…}` / `{…}`); all relative links resolve; roadmap DOC-431 → 443 are `[x]` and the `status:` line already reads 431 / 536 with Step 42 complete.
**Fixed**
- `dues.md`: heading «مستحقات متجر واحد» had an unclosed code span (`/dues/<schema>`).
- `overview-and-stores.md`: «قائمة العملاء» was quoted as a UI label but no such label exists; reworded as plain text pointing to the `clients/` search.
- `subscriptions-and-billing.md`: «الملاحظات» → «ملاحظات», the field label in `subscriptions-screen.tsx:211`.
- `features-and-overrides.md`: English gloss "(kill switch)" replaced by the field name `is_active_globally`.
- 9 pages (`apps-and-market-categories`, `deactivation`, `features-and-overrides`, `plans`, `reprovision`, `sharwa-ship-zones`, `sign-in-and-roles`, `subscriptions-and-billing`, `webhook-events`): bare `superuser` / `is_staff` in the «الحساب المطلوب» row and the roles table now read «مالك المنصة» (`superuser`) / «مشرف تشغيلي» (`is_staff`).
- `docs/guides/console/16-platform-console/README.md` and `docs/guides/console/README.md`: duplicated title «لوحة مالك المنصة — لوحة مالك المنصة» fixed; "planned pages" wording and «كُتبت» status aligned with the merchant index pages («## الصفحات», «مكتوبة (الخطوة 42)»).
**Not changed**: roadmap ticks and `status:` (already correct); the Step 42 discrepancy call-out about «متعثّر (> 30 دقيقة)» (confirmed against `stores-screen.tsx` and the server thresholds).
**Left open**: the 20 screenshots are placeholders, not captured (as for Steps 14–36); no screen was opened in a browser during this audit.

## 2026-10-28 — Official Step 42 · M-4 Console · 2.18 Platform console manual (دليل لوحة مالك المنصة) (DOC-431 → DOC-443)

**Verified first**: the Step 42 row of `execution-plan.md` reads Milestone **M-4** (Console), subsection "2.18 Platform console manual", DOC-431 → 443, 13 tasks, output `docs/guides/console/` (Track 2 — Arabic, RTL). Only that roadmap block was read, with `docs/README.md`, `docs/glossary.md`, `docs/_templates/guide-page.md` and a finished merchant guide (`custom-domain.md`) for house style.
**Ticked**: DOC-431 → DOC-443 (13 tasks). Roadmap status is now 431 / 536; next is official Step 43 (1.13 Domain 9 API + 1.19 Domain 14 API, DOC-164 → 168, DOC-253 → 262).
**Sources verified against code**: every console screen under `src/features/platform-admin/components/` (login, overview, stores + bulk dialogs, store detail + the six tabs, webhook events, money: dues overview/detail, topups, withdrawals, wallet, requests-kit; billing: plans, matrix, subscriptions, settings, features, overrides; catalog: apps, categories; zones; shell: admin-shell + admin-nav) plus `schemas/{auth,common,stores,money,billing,catalog}.ts` labels and the backend messages already verified in Steps 40–41. Console routes are the visible `console.<base>/…` paths (`admin-nav.ts`): `/`, `/stores`, `/dues`, `/sharwa-pay/topups`, `/sharwa-pay/withdrawals`, `/wallets/<phone>`, `/sharwa-ship/zones`, `/plans`, `/plans/matrix`, `/subscriptions`, `/billing-settings`, `/apps`, `/market-categories`, `/features`, `/features/overrides`, `/webhook-events`, `/login`.

**Added** (Arabic, RTL, from `docs/_templates/guide-page.md`; 13 pages under `docs/guides/console/16-platform-console/`)
- `sign-in-and-roles.md` (DOC-431), `overview-and-stores.md` (DOC-432), `reprovision.md` (DOC-433), `store-detail.md` (DOC-434), `deactivation.md` (DOC-435), `features-and-overrides.md` (DOC-436), `webhook-events.md` (DOC-437), `dues.md` (DOC-438), `sharwa-pay-review.md` (DOC-439), `sharwa-ship-zones.md` (DOC-440), `plans.md` (DOC-441), `subscriptions-and-billing.md` (DOC-442), `apps-and-market-categories.md` (DOC-443). Each page: «لمن هذه الصفحة؟» table with the owner/operator split, task steps with verbatim UI labels and messages, impact sentences from the confirm dialogs, messages tables, limits, cross-links, and screenshot placeholders registered per `docs/README.md` §5.4 (20 placeholders, mock mode).

**Changed**
- `docs/guides/console/16-platform-console/README.md`: «الحالة» column added — all 13 pages marked written (Step 42).
- `specs/003-documentation/documentation-roadmap.md`: ticks + Status lines for DOC-431 → 443; status line (431 / 536, Step 42 added to the screenshots-pending list, next step 43).

**Discrepancies found — roadmap vs code** (1)
1. DOC-432: the roadmap states the stalled thresholds as "pending > 5 min, provisioning > 20 min" — which is what the server computes — but the stores filter label in the UI says «متعثّر (> 30 دقيقة)» and the overview figure says «متعثّرة (> 30 دقيقة)»; there is no 30-minute threshold in the code. Documented as a `> ⚠️ تنبيه اختلاف` call-out in `overview-and-stores.md` (same finding as Step 40's m20-console.md §4.2, now surfaced in the guide).

## 2026-10-28 — Audit of official Step 41 · M-4 Console · 1.21 Domain 16 API (part B) (DOC-275 → DOC-283)

**Scope**: independent audit of the Step 41 execution — `docs/api/domains/16-platform-console/m45-dues-sharwa-pay-admin.md` (DOC-274 → 278) and `m46-plans-billing.md` (DOC-279 → 283) — against the Step 41 row of `execution-plan.md`, the DOC-275 → 283 task blocks of the roadmap and `docs/_templates/api-endpoint.md`. Documentation only; no application code touched, nothing committed.
**Checked**: (a) both pages sit in `docs/api/domains/16-platform-console/`, the Output path of every task; (b) header block (Source · Live key · Django provider · Frontend contract · Tests · Last verified) and sections 1–7 follow the template order, no template comments or placeholders left; (c) Track 1 English: Arabic appears only in «…» quotes, in literal JSON response bodies / code spans copied from the server, and in the template's Arabic module name in the H1; (d) every «…» sentence was compared with the Django source (`tenants/console_money_service.py`, `console_billing_service.py`, `merchant_billing.py`, `sharwapay/models.py`, `billing/models.py`): f-string sentences match their templates, `غير متاح بعد.` matches `src/mocks/runtime.ts:59`; (e) all 3 Mermaid blocks render with `mmdc`; (f) all 19 relative links point at existing pages; (g) roadmap: DOC-275 → 283 are `[x]` (418 `[x]` DOC tasks in total, matching the `status:` line 418 / 536) and the `status:` text already lists Step 41 as complete.
**Fixed**
- `m46-plans-billing.md` §4.3: the phrase «الغياب = لا» was presented as a quotation but exists nowhere in the code; replaced with the real docstring wording «الغياب = عدم منح» (`billing/models.py:258`).
**Not changed**: roadmap ticks and `status:` (already correct); `README.md` of the folder (already marks `m45` and `m46` as written).
**Left open**: no Django test or Newman run was executed in this audit (read-only comparison with the code); the nested-quote sentences were checked by their innermost fragments.

## 2026-10-28 — Official Step 41 · M-4 Console · 1.21 Domain 16 API (part B: M45 dues/Sharwa Pay admin, M46 billing) (DOC-275 → DOC-283)

**Verified first**: the Step 41 row of `execution-plan.md` reads Milestone **M-4** (Console), subsection "1.21 Domain 16 API (part B: M45 dues/Sharwa Pay admin, M46 billing)", DOC-275 → 283, 9 tasks, outputs `m45-dues-sharwa-pay-admin.md` (append) and `m46-plans-billing.md` (create). Only that task block was read from the roadmap, with `docs/README.md`, `docs/glossary.md`, `docs/_templates/api-endpoint.md` and the Step-40 pages of the same folder.
**Ticked**: DOC-275 → DOC-283 (9 tasks). Roadmap status is now 418 / 536; next is official Step 42 (2.18 Platform console manual, DOC-431 → 443).
**Sources verified against code**: `tenants/console_money_service.py` and `console_billing_service.py` (whole files), `api/views_platform.py:334-552`, `api/urls.py:495-518`, `products/models/billing.py`, `tenants/merchant_billing.py`, `products/services/app_marketplace_service.py`, `sharwapay/models.py` + `migrations/0003`, `appstore/models.py` + `migrations/0007`, `billing/models.py`, `tenants/webhooks.py` (Kuraimi), `sharwapay/customer_api.py` (debit at request), legacy `sharwapay/admin.py` / `billing/admin.py` / `appstore/admin.py` / `marketing/admin.py`, both test files (`api/test_platform_money_api.py` — 7 tests, `api/test_platform_billing_api.py` — 7 tests), and the frontend contracts (`schemas/money.ts`, `billing.ts`, `catalog.ts`, `hooks.ts`, mock router, BFF catch-all, `topups-screen`, `zones-screen`/`zone-map`). Every «…» sentence was grep-checked against the code. The tests were read, not run.

**Added** (English, from `docs/_templates/api-endpoint.md`)
- `docs/api/domains/16-platform-console/m46-plans-billing.md` (DOC-279 → 283): the 13-route M46 table; plans CRUD with every validation sentence and both DELETE refusals; the plan × feature matrix and subscriptions with the `assign_plan` side effects; billing settings with the enable-plans transaction (sequence diagram) and its precondition; apps with the `icon_name` convention, the `UNION ALL` installation counter and `is_billed_for_client`; market categories with the full-id-set reorder and the «عطّلها بدل الحذف» refusal.

**Changed**
- `docs/api/domains/16-platform-console/m45-dues-sharwa-pay-admin.md`: appended §4.4 dues actions (per-action effects, the three money sentences verbatim, row-lock chain), §4.5 top-up review (the four approve rules, migration `sharwapay/0003` with the «كريمي» / «الرقم الوارد: X» backfill, receipt rendering, `topup_auto`/`topup_manual`), §4.6 withdrawals + wallet lookup (debit-at-request sequence diagram, `withdrawal_reversal` in one transaction, `0777…` phone cleaning, last-100 movements), §4.7 zones (immutable `SAN-01`-form code, geo trio, 7-decimal quantize, owner-only); §3 table now points every row at its section; §5/§6 extended (the `generate_billing_charge` savepoint fix, the `credited_at` guard, fixture differences).
- `docs/api/domains/16-platform-console/README.md`: `m45` marked written (Steps 40 + 41), `m46` marked written (Step 41).
- `specs/003-documentation/documentation-roadmap.md`: ticks + Status lines for DOC-275 → 283, status line (418 / 536, next step 42).

**Discrepancies found — roadmap vs code**: none. The nine tasks matched the code on every checked rule, including the `generate_billing_charge` savepoint fix, the `credited_at` guard, the wallet-linking rule for unmatched top-ups, zone code immutability, `assign_plan` as the single assignment point, and the enable-plans auto-assignment. Notes, not discrepancies: the mock router creates a wallet when approving an unmatched top-up where Django answers `400` (flagged in `m45` §6 as a fixture difference), and the stale «لا يؤثر بأثر رجعي» help text is still on the `PlatformBillingSettings` model (flagged in `m46` §6).

## 2026-10-28 — Official Step 40 · M-4 Console · 1.21 Domain 16 API (part A: M20 console) (DOC-266 → DOC-274)

**Verified first**: the Step 40 row of `execution-plan.md` reads Milestone **M-4** (Console), subsection "1.21 Domain 16 API (part A: M20 console)", DOC-266 → 274, 9 tasks, output `docs/api/domains/16-platform-console/m20-console.md`. Only roadmap subsection `### 1.21 Domain 16 API` (DOC-266 → 274) was read, with `docs/README.md`, `docs/glossary.md`, `docs/_templates/api-endpoint.md` and the finished `auth.md` of the same folder for house style. The Output of DOC-274 in the roadmap is `m45-dues-sharwa-pay-admin.md`, not `m20-console.md`, so that page was created in this step with DOC-274 only.
**Ticked**: DOC-266 → DOC-274 (9 tasks). Roadmap status is now 409 / 536; next is official Step 41 (1.21 Domain 16 API part B: M45 dues/Sharwa Pay admin, M46 billing, DOC-275 → 283).
**Note on method**: the device shell was unavailable; files were staged from the computer, the pages were written in the cloud workspace (three parallel writers) and committed back. All 8 Mermaid blocks render with `mmdc`. Every «…» sentence was grep-checked against the code; four are server templates built from a count or a status. The tests were read, not run.

**Added** (English, from `docs/_templates/api-endpoint.md`)
- `docs/api/domains/16-platform-console/m20-console.md` (DOC-266 → DOC-273): authentication and roles with the role × capability matrix, overview / stores / clients, re-provisioning, store detail and Sharwa Ship, features / domains / deactivation, feature catalogue and resolution, carrier dead-letter queue, and the 21-route table with migrations, savepoints, BFF wiring and the 14 tests.
- `docs/api/domains/16-platform-console/m45-dues-sharwa-pay-admin.md` (DOC-274): `dues/overview/` and `dues/<schema>/`.

**Changed**
- `docs/api/domains/16-platform-console/README.md`: «Status» column; `m20-console.md` marked written, `m45` marked partly written.
- `specs/003-documentation/documentation-roadmap.md`: ticks, a Status line for each of the 9 tasks, status line (409 / 536, next step 41).

**Discrepancies found — roadmap vs code** (each flagged with `> ⚠️ Discrepancy` in its page)
1. DOC-266: the lockout is "5 failures per username in 15 minutes", but the lock applies when the counter is already at 5 (the 6th attempt gets 429), the window is fixed from the first failure and `Retry-After` is a constant 900 (`api/views_platform.py:78-79,153-157`).
2. DOC-267: the server stall thresholds match (pending > 5 min, provisioning > 20 min), but the console UI says «> 30 دقيقة» in two screens (`stores-screen.tsx:136`, `overview-screen.tsx:52`). Screens poll every 3000 ms on `pending` and `provisioning` rows that are not stalled, and while Sharwa Ship is changing.
3. DOC-267: `total_stores` counts every non-public store, the legacy dashboard only active ones (`tenants/views.py:275,286`; `console_service.py:348-353`); the label says "last snapshot" but the server sums all snapshots.
4. DOC-268: the console re-provisions only failed or stalled stores; the admin action it copies re-queues any non-ready store (`console_service.py:445,448`; `tenants/admin.py:130-135`).
5. DOC-269: the up-front refusal for a store without the `sharwa_ship` feature happens only if a `Feature` row with that code exists, and answers 400 (`console_service.py:469-471`).
6. DOC-270: the waybill-issue and banner guards also require status suspended/deactivated and `closed_at` null (`products/services/shipping_billing_service.py:55-62`, `products/views/edge_cases.py:28-40`); the 255 limit is on feature-override `notes`, not on the deactivation `reason` (`console_service.py:542,697`); `domains/` and `domains/<id>/` are `POST` only (`api/urls.py:483-484`).
7. DOC-271: `resolve_feature_decision` checks the override before the global kill switch (`billing/models.py:200-203`); the server returns `plan_feature_missing`, and «غير متاحة» is frontend text (`billing/models.py:208-209`).
8. DOC-272: the `source` filter is a free exact match on `carrier_code` with no list (`console_service.py:942-944`); the retry key equals the receiving view's key only when the payload has `event_id` or `event_time` (`api/views.py:721` vs `console_service.py:978`).
9. DOC-273 / DOC-274: not every tenant-schema read is wrapped in a savepoint; `dues_detail` (`tenants/console_money_service.py:254`) and `due_action` (`:334`) use a bare `schema_context`, so a ready store with a missing schema answers 500.
10. DOC-273: the count of 21 M20 routes and of 14 tests holds (21 paths at `api/urls.py:473-493`, 14 `def test_` in `api/test_platform_console_api.py`). The money block is 10 routes at `urls.py:495-504`, not 495-502.

**Open items recorded in the pages (code vs code)**: a re-provisioned store reads as stalled at once; `queued: true` is not broker confirmation; a skipped Sharwa Ship job leaves the marker for 10 minutes; the lockout can be triggered by anyone and has no unlock route; `add_domain` and `deactivation_action` check before they lock; a retried event can differ in key; the frontend sources `jeeb`, `kuraimi` and `whatsapp` cannot be produced by `CarrierWebhookView`; `dues/<schema>/` has no missing-schema test; the dues overview and detail look up the merchant wallet differently.

**Left open**: no test, script or request was run (the 14 console tests, `scripts/admin-stores-check.ts` and `scripts/admin-money-check.ts` were read only); the CSRF first-visit behaviour is read from code; `ATOMIC_REQUESTS` was checked only in `config/settings.py`; the fixture router was not compared route by route with the 21 Django routes; `billing/context_processors.py` (named in the `resolve_feature_decision` docstring) was not available to read.

## 2026-10-28 — Official Step 39 · M-3 Merchant core · 3.8 Migrations ledger + 3.10 Deployment + 3.12 Infra fixes (DOC-508 → DOC-510, DOC-515 → DOC-519, DOC-523 → DOC-525)

**Verified first**: the Step 39 row of `execution-plan.md` reads Milestone **M-3** (Merchant core), subsections "3.8 Migrations ledger", "3.10 Deployment" and "3.12 Infra fixes", DOC-508 → 510, DOC-515 → 519, DOC-523 → 525, 11 tasks, output under `docs/ops/migrations/`, `docs/ops/deployment/`, `docs/ops/runbooks/`, `docs/ops/dev-setup-windows.md` and `docs/architecture/60…62`. Only those roadmap subsections were read, with `docs/README.md`, `docs/glossary.md` and the `architecture-page` and `runbook` templates.
**Ticked**: DOC-508, 509, 510, 515, 516, 517, 518, 519, 523, 524, 525 (11 tasks). Roadmap status is now 400 / 536; next is official Step 40 (1.21 Domain 16 API (part A: M20 console), DOC-266 → 274). Four of the ticked tasks have a "Done when" that needs a real run (DOC-508, 510, 517, 519); see **Left open**.
**Note on method**: the device shell was unavailable; files were staged from the computer, the pages were written in the cloud workspace (four parallel writers) and committed back. All 14 Mermaid blocks render with `mmdc`. Arabic is quoted only in «…», grep-checked against the code. Relative links were checked against the files in the repo and the new pages. No application code was changed and no command from the pages was run against a database, server or Windows machine.

**Added** (English)
- `docs/ops/migrations/phase-002-ledger.md` (DOC-508), `backfills.md` (DOC-509)
- `docs/ops/runbooks/migrations.md` (DOC-510), `custom-domain-tls.md` (DOC-516)
- `docs/ops/deployment/topology.md` (DOC-515), `go-live-checklist.md` (DOC-517), `rollback.md` (DOC-518)
- `docs/ops/dev-setup-windows.md` (DOC-519)
- `docs/architecture/60-arabic-normalization.md` (DOC-523), `61-phone-normalization.md` (DOC-524), `62-infra-fixes.md` (DOC-525)

**Changed**
- `docs/ops/migrations/README.md`, `docs/ops/deployment/README.md`, `docs/ops/runbooks/README.md`: «Status» column; written pages marked and linked.
- `docs/ops/README.md`: `dev-setup-windows.md` marked written; `migrations/`, `deployment/` and `runbooks/` rows updated.
- `specs/003-documentation/documentation-roadmap.md`: ticks, a Status line for each of the 11 tasks, status line (400 / 536, next step 40).

**Discrepancies found — roadmap vs code** (each flagged with `> ⚠️ Discrepancy` in its page)
1. DOC-508: the roadmap totals 28 migrations; there are 32 migration files in the Phase 002 range (26 + 2 + 2 + 1 + 1); 28 is the number of rows of inventory A.9. INT-006 is listed as having no migration but has three (`products/0208`, `0209`, `0210`).
2. DOC-509: `0229` marks every shift and makes `opened_by` / `created_by` nullable; it does not set existing rows to `NULL`. No migration derives the PO number (`PO-{pk:04d}` is computed on read, `products/models/suppliers.py:96-99`). `sharwapay/0003` does not backfill `reviewed_by`. `0225` and `0223` contain no `RunPython`; the movement reference and the alert value/limit are derived on read. Observation: the movement-log label is `PO-{id}` and the order number is `PO-{pk:04d}`.
3. DOC-510 / DOC-525: `dues_detail` and `due_action` (`tenants/console_money_service.py:254, 334`) use a bare `schema_context`; the roadmap says every console tenant read is wrapped in a savepoint.
4. DOC-515: Gunicorn runs `sync` workers, not uvicorn (`deploy/gunicorn.conf.py:31-32`); Nginx has `client_max_body_size 55m` (the 8 MB figure is Django's `DATA_UPLOAD_MAX_MEMORY_SIZE`, and its comment in `settings.py:364-367` is stale); there is one Nginx server pair proxying everything to Gunicorn, with no Next.js server, console block or Sharwa Pay origin.
5. DOC-516: no hand-off from a domain reaching `verifying` to operations (no notification, list or Beat task; `CustomDomain` is not registered in `tenants/admin.py`); per-domain entries are needed for CSRF and `ALLOWED_HOSTS` (`config/settings.py:24, 54-68`).
6. DOC-517: the debug OTP `123456` is also accepted in the merchant password-reset send and verify steps (`api/views_auth.py:376, 460`), which `environment.md` §6 does not list; all are gated by `DEBUG`; the default free plan rule is enforced only on the console path; the mock-only hooks are stopped only by `mockRoute`'s `isMocksOn()` test; the US1–US5 checkpoints have no dated run recorded.
7. DOC-518: removing a key from `SHARWA_LIVE_MODULES` does nothing while `SHARWA_MOCKS=off` (`src/mocks/runtime.ts:48-49`); a module can be switched off only by turning mocks on and listing the other 38 keys.
8. DOC-519 / DOC-525: `DevMediaMiddleware` compares the final file name after NFC + `casefold()`, not "case variants of Arabic names" (`config/middleware.py:153-156`); no test covers a case difference.
9. DOC-523: the PostgreSQL expression does not fold digits or whitespace; only the palette and storefront catalogue searches use it (inventory, locations, customers and wallets use other paths); the products and orders lists use plain `icontains` with Django live; storefront `description` is matched unfolded.
10. DOC-524: twenty backend and four frontend entries turn a phone into a stored or compared value, with different rules; the affiliate pattern is applied to the digits as typed (a local `07…` is refused); the same Saudi text is accepted in staff creation and refused in storefront and order APIs; staff login for Saudi numbers; the browser mirror of `customer_key` differs on four of 19 test inputs.
11. DOC-525: `X-Export-Rows` is also set by the inventory export; the console session endpoint is `/api/v1/platform/auth/me/` and the layout folder is `%5Fa` on disk.

**Open items recorded in the pages (code vs code)**: see the "Open items" section of each page; the main ones are the stale Nginx comment in `settings.py`, the missing hand-off for custom-domain TLS, and the inconsistent phone rules across modules.

**Left open**: the acceptance checks that need a real environment were **not run** — DOC-508 (ledger against `showmigrations` on a fresh database), DOC-510 (runbook executed once on staging, with timings), DOC-516 (a domain taken to `active`), DOC-517 (checklist signed off on staging; every result column reads "not run"), DOC-518 (no rollback option executed) and DOC-519 (a fresh Windows machine reaching a working store). The verification queries of `backfills.md` and every runbook command are derived from code, not dry-run (DOC-532).

## 2026-10-28 — Official Step 38 · M-3 Merchant core · 3.7 Background jobs (DOC-497 → DOC-507)

**Verified first**: the Step 38 row of `execution-plan.md` reads Milestone **M-3** (Merchant core), subsection "3.7 Background jobs", DOC-497 → 507, 11 tasks, output `docs/architecture/jobs/*` and the Celery/Beat runbook. Only the roadmap subsection `### 3.7 Background jobs (Celery & Beat)` was read, with `docs/README.md`, `docs/glossary.md`, `docs/_templates/architecture-page.md` and `docs/_templates/runbook.md`. Sources: `config/celery.py`, `config/settings.py` (`CELERY_*`, `CELERY_TASK_ROUTES`, `CELERY_BEAT_SCHEDULE`), `products/tasks/*.py`, `tenants/tasks.py`, `products/order_events.py`, `products/whatsapp_service.py`, `products/signals*.py`, `tenants/webhooks*.py`, the job services under `products/services/**`, the `deploy/` Celery files and the routes in `api/urls.py`.
**Ticked**: DOC-497 → DOC-507 (11 tasks). Roadmap status is now 389 / 536; next is official Step 39 (3.8 Migrations ledger + 3.10 Deployment + 3.12 Infra fixes, DOC-508 → 510, DOC-515 → 519, DOC-523 → 525).
**Note on method**: the device shell was unavailable; files were staged from the computer, the pages were written in the cloud workspace (four parallel writers) and committed back. Mermaid blocks were rendered with `mmdc`. Every «…» sentence was grep-checked against the code. No application code was changed; no test or Celery process was run; the runbook commands were **not dry-run** (DOC-532).

**Added** (English)
- `docs/architecture/50-background-jobs.md` (DOC-497)
- `docs/architecture/jobs/order-push.md` (DOC-498), `campaigns.md` (DOC-499), `webhooks.md` (DOC-500), `provisioning-and-carrier-webhooks.md` (DOC-501), `pos-support-awb.md` (DOC-502), `channels.md` (DOC-503), `marketplaces.md` (DOC-504), `dropshipping.md` (DOC-505), `whatsapp.md` (DOC-506)
- `docs/ops/runbooks/celery.md` (DOC-507)

**Changed**
- `docs/architecture/jobs/README.md`: «Status» column; the nine pages marked written, with a link to the register.
- `specs/003-documentation/documentation-roadmap.md`: ticks, a Status line for each of the 11 tasks, status line (389 / 536, next step 39).

**Discrepancies found — roadmap vs code** (each flagged with `> ⚠️ Discrepancy` in its page)
1. DOC-497/499: `send_campaign` is a plain function (`products/campaigns.py:196-247`); the status flip under a row lock is in `marketing_service.dispatch_campaign`, and the task that sends is `dispatch_broadcast_campaign_chunk` (`products/tasks/channels.py:625`, queue `channels_broadcast`).
2. DOC-497: `queue_provisioning` is a plain never-raising helper (`tenants/provisioning.py:116-125`); the task is `tenants.tasks.provision_tenant_schema`.
3. DOC-497/506: `send_whatsapp_notification_async` and `notify_sharwaconnect_of_order_event` are plain functions that enqueue on commit; `send_whatsapp_notification_async` has no non-test caller, so `dispatch_whatsapp_message` is never enqueued in production; `dispatch_order_event` runs on `default`, not `whatsapp`.
4. DOC-497/504: `retry_failed_confirmation` is a service function that re-queues `confirm_marketplace_shipment_task` (`shipment_confirm_service.py:130`); `NO-ID` errors are recorded only by the DRF push path; the 409 on `order_pull` / `fba_inventory` exists only on the API, and a live job is replaced after 30 minutes (`STALE`).
5. DOC-497: "POS force-close" is Beat `force-close-expired-shifts` (`*/30`) → `force_close_expired_shifts` → `force_close_expired_shifts_for_tenant`.
6. DOC-497/500: `deliver_webhook` has no `autoretry_for`; each retry is a new `WebhookDelivery` row with a countdown (`AUTO_RETRIES=3`, `RETRY_DELAYS=(60, 300)`, `webhook_service.py:316-331`).
7. DOC-497: "tasks never raise into the caller" holds only for event hooks and `queue_provisioning`; operator-started jobs call `.delay()` bare (`export_service.py:183`, `channels_api_service.py:419`, `push_service.py:105`, `support_lock_service.py:167`).
8. DOC-497: about 75 tasks are missing from the roadmap's list (all other Beat dispatchers, report tasks, supplier-order tasks, extra channel tasks, the Sharwa Ship pair and others); the register has 110 tasks and 26 Beat entries.
9. DOC-497: not in `CELERY_BEAT_SCHEDULE` — `release_expired_inventory_reservations`, `reconcile_stale_payment_intents`, `escalate_stale_manual_transfers`, `archive_old_orders` (each with a tenant child), `archive_stale_conversations`, `tenants.tasks.aggregate_tenant_stats`; the command `send_abandoned_cart_reminders` has no scheduler (DOC-499) and `release_stuck_orders` has none either.
10. DOC-498: `ORDER_SHIPPED` is emitted only by the legacy dashboard view (`products/views/shipping.py:244-246`); the manual broadcast is a separate task `send_push_broadcast` (`api/views_push.py:70`).
11. DOC-501: the DLQ `source` filter is a free exact match on `PendingWebhookEvent.carrier_code`, not a fixed list including `sharwa_ship`; the Sharwa Ship enable/disable tasks have no retry and no dedicated queue, and only activate refuses up front.
12. DOC-502: `retry_pending_awb_issuance_for_tenant` retries every `pending` row of the store, not the clicked item; the `awb_failed` notification is derived by the notification sync, not created by a task; `send_staff_reply_message` is used only by the legacy dashboard view.
13. DOC-503: `error_detail` carries the generic «رفض مزوّد القناة تنفيذ العملية.» for any provider HTTP error (no 24 h-window mapping); only Meta, TikTok and Telegram have their own queue (WhatsApp shares `whatsapp`); TikTok replies always fail.
14. DOC-505: the dropshipping `order_*` types are `order_forward` and `order_status_poll` (never created; `catalog_search` also never created); the pricing-rule `apply` endpoint answers 200, not 202.
15. DOC-506: the event map (`ORDER_CREATED → order_new` …) is applied only when the usage log is read (`apps_api_service.py:36-47`); rows are stored with the `ORDER_*` constants.
16. DOC-507: there is no result backend (`CELERY_TASK_IGNORE_RESULT=True`, no `CELERY_RESULT_BACKEND`); the `support` queue is declared in `deploy/celery.env` but no code routes to it.

**Open items recorded in the pages (code vs code)**: a channel reply can stay `queued` forever when retries are exhausted (`_LoggingFailureTask.on_failure` updates only `AppUsageLog`); `archive_stale_conversations` has no `schema_context` or fan-out; `WhatsAppSessionIndex` is never populated by code; `AppUsageLog` rows stuck in `queued` and `WebhookDelivery` rows stuck in `pending` have no sweeper; `update_marketplace_price_quantity_task` leaves no job row; `product_import`, `price_sync` and `feed_import` chains are not revived; `cancel_supplier_order_task` retries every 300 s without a limit; `dispatch_platform_event` passes the webhook secret through Redis as a task argument; `sharwa.bat` starts no worker or Beat; `products/test_wa_simplify.py` imports the removed `WhatsAppSettings`; `SHARWA_CHANNELS_RATE_LIMIT_PER_MINUTE` is missing from `docs/ops/environment.md`.

**Left open**: the Beat timezone is not set (`CELERY_TIMEZONE`) and was not confirmed at runtime; the Windows worker/Beat commands in the runbook are not code-verified; no runbook command has been dry-run (DOC-532).

## 2026-10-28 — Official Step 37 · M-3 Merchant core · 3.6 Data model (Domains 1–8) (DOC-481 → DOC-488)

**Verified first**: the Step 37 row of `execution-plan.md` reads Milestone **M-3** (Merchant core), subsection "3.6 Data model (Domains 1–8)", DOC-481 → 488, 8 tasks, output `docs/architecture/data-model/0N-*.md`. Only the roadmap subsection `### 3.6 Data model reference per domain` (DOC-481 → 488) was read, with `docs/README.md`, `docs/glossary.md`, `docs/_templates/architecture-page.md` and the existing architecture pages for house style. Sources: Django `products/models/*.py`, `tenants/models.py`, `sharwapay/models.py`, `billing/models.py`, `api/views_*.py`, `api/serializers*.py`, `api/urls.py`, `products/services/*.py`, `products/cart.py`, `products/pricing.py`, `tenants/merchant_rollup.py` and the Phase 002 migrations; the Django test files named by each task were checked for existence and counted.
**Ticked**: DOC-481 → DOC-488 (8 tasks). Roadmap status is now 378 / 536; next is official Step 38 (3.7 Background jobs, DOC-497 → 507).
**Note on method**: the device shell was unavailable; files were staged from the computer, the pages were written in the cloud workspace (four parallel writers, two pages each) and committed back. Every Mermaid block on pages 03–08 renders with `mmdc`; pages 01–02 were checked structurally only. No application code was changed; no tests were run (test counts are `def test_` counts).

**Added** (English, from `docs/_templates/architecture-page.md`)
- `docs/architecture/data-model/01-public-onboarding.md` (DOC-481)
- `docs/architecture/data-model/02-dashboard-shell.md` (DOC-482)
- `docs/architecture/data-model/03-catalog.md` (DOC-483)
- `docs/architecture/data-model/04-orders-returns.md` (DOC-484)
- `docs/architecture/data-model/05-storefront.md` (DOC-485)
- `docs/architecture/data-model/06-customers-wallets.md` (DOC-486)
- `docs/architecture/data-model/07-marketing-design-partners.md` (DOC-487)
- `docs/architecture/data-model/08-finance.md` (DOC-488)

**Changed**
- `docs/architecture/data-model/README.md`: «Status» column; pages 01–08 marked written.
- `specs/003-documentation/documentation-roadmap.md`: ticks, a Status line for each of the 8 tasks, status line (378 / 536, next step 38).

**Discrepancies found — roadmap vs code** (each is also flagged with `> ⚠️ Discrepancy` in its page)
1. DOC-481: "pending registration (30-min lifetime)" is not a model; it is a cache entry written by `RegisterView` (`api/views_onboarding.py:385-390`, TTL `PENDING_TTL_SECONDS`, `:174`).
2. DOC-481: only `public/stats/` is cached server-side (3600 s, `api/views_public.py:41-42, 107`); `public/plans/` is computed per request. The 1 h cache of both comes from Next.js `cacheLife("hours")`.
3. DOC-481: `stores_count` exists only in the platform-console listing (`tenants/console_billing_service.py:512-514`); the public endpoint returns `id` and `name`.
4. DOC-482: the roll-up's default 30-day range uses the Django `TIME_ZONE` (`Asia/Riyadh`), not the store timezone (`tenants/merchant_rollup.py:43-47`); `TenantStatsSnapshot` is written by `products.tasks.populate_tenant_stats_snapshot` (Beat 00:40), while `aggregate_tenant_stats` (`tenants/tasks.py:120-148`) is unscheduled.
5. DOC-483: "decimal min/max quantities" is not in migrations 0211–0215; `Decimal(12,3)` comes from `0128_product_allow_variable_quantity_product_unit_and_more.py`.
6. DOC-483: the "35 central sectors/templates" are per-store tenant-schema copies seeded by `sector_seed_service.seed_sectors` at provisioning.
7. DOC-483: stale docstrings/README (`api/views_products.py:19-21`, `src/app/api/bff/README.md:26`, `storefront_cart_service.py:15`); SKU length 64 (serializer) vs 100 (model); tier `min_quantity` is an integer; the import-status poll needs `catalog.manage`; the 20,000-row cap is the import service's `MAX_ROWS` while shared `FeedReader` allows 200,000.
8. DOC-484: `ReturnRequest.decision_note` does not exist (derived from the `return.rejected` audit row); the order state is three fields (`status`, `payment_status`, `fulfillment_status`), not two; the transition table is `FINANCIAL_TRANSITIONS` in `order_api_service.py:49-57`, not copied from the legacy view (which has no table); RMA is created directly as `in_transit_back`; statuses `approved`/`processing` (returns) and `closed` (RMA) are never assigned; `src/app/api/bff/README.md:61` is stale; `COD_REFUSAL_THRESHOLD` is not defined in settings (always 3).
9. DOC-485: the service-worker push payload also carries `icon`.
10. DOC-486: the reliability fields are `cod_status_reason`, `cod_status_updated_at`, `cod_status_updated_by` (`products/models/reverse_logistics.py:76-78`); "checkout refuses `cod`" is true only for the JSON checkout; `COD_REFUSAL_THRESHOLD` has no setting.
11. DOC-487: `unique_together` was dropped in `0042_storesection_content_blocks.py` (model comment says 0043); the "(8)" test count matches `test_partners_api.py` only (25 tests in the three files); legacy `mark_influencer_paid` bypasses the single payout path; `_buy_x_get_y_discount` lives in `products/services/messaging.py:233`.
12. DOC-488: there are no payout form classes (`merchant_settings.py:696-748` reads `request.POST`); "audit rows" are the two wallet transaction models.
13. DOC-488 vs `architecture/43-ledgers.md`: `OperatingExpense` has a second writer (legacy `operating_expenses_view`, `products/views/operations.py:17-35`, accepts 0.00 and free-text currency); expenses never reduce net revenue (`compute_net_revenue` has no caller passing them); `expense_date` is indexed (`operations.py:39`).

**Open items recorded in the pages (code vs code)**: `MerchantAccount`/`MerchantAccountClient` have no creator; manual COD re-enable does not reset `cod_refusals_count`; legacy payout delete has no pending-withdrawal guard; `SharwaPayWithdrawalRequest` has no idempotency key; no API route decides merchant withdrawals; `StoreSetting.merchant_balance` is unused; three order tasks have no Beat entry (`archive_old_orders`, `reconcile_stale_payment_intents`, `escalate_stale_manual_transfers`). Full lists are in §9 of each page.

## 2026-10-28 — Official Step 36 · M-3 Merchant core · 2.16 Reports manuals (DOC-425 → DOC-427)

**Verified first**: the Step 36 row of `execution-plan.md` reads Milestone **M-3** (Merchant core), subsection "2.16 Reports manuals", DOC-425 → 427, 3 tasks, output `15-*` guides. Only the roadmap subsection `### 2.16 Reports (التقارير)` was read, with `docs/README.md`, `docs/glossary.md`, `docs/guides/_style-guide.md`, `docs/guides/_glossary.md` and `docs/_templates/guide-page.md`. Sources: `src/features/reports/{api,permissions,range,schemas}.ts` and `components/{reports-index,report-screen,report-chart,export-job,exports-screen,scheduled-screen}.tsx`, `src/features/pwa/components/push-broadcast.tsx`, `src/features/dashboard-shell/navigation.ts`; Django `api/views_reports.py`, `api/views_push.py`, `api/serializers.py`, `products/services/{export_service,reports_registry,reports_contract,notification_service}.py`, `products/tasks/reports.py`; API pages `docs/api/domains/15-reports/m25-reports.md` and `docs/api/domains/05-storefront/m44-pwa.md` §4.
**Ticked**: DOC-425 → DOC-427 (3 tasks). Roadmap status is now 370 / 536; next is official Step 37 (3.6 Data model (Domains 1–8), DOC-481 → 488).
**Left open**: the 5 new screenshots are registered in `docs/guides/_assets/shots.json` but **not captured** — the device shell was unavailable (files were staged, written in the cloud workspace and committed back); `reports-overview-2` needs multi-location on in the noor mock (noted in `_screenshots.md`).

**Added** (Arabic, RTL, from `docs/_templates/guide-page.md` and `docs/guides/_style-guide.md`)
- `docs/guides/merchant/15-reports/reports-overview.md` (DOC-425)
- `docs/guides/merchant/15-reports/exports-and-schedules.md` (DOC-426)
- `docs/guides/merchant/15-reports/browser-notifications.md` (DOC-427)

**Changed**
- `docs/guides/_assets/shots.json`: 5 new `merchant/15-reports/*` entries (merchant session; total 191).
- `docs/guides/_screenshots.md`: §7 rows and a hidden step-36 note.
- `docs/guides/_glossary.md`: §8 gains مركز التقارير، التصدير، التقرير المجدول، إشعارات المتصفح.
- `docs/guides/merchant/15-reports/README.md`: «الصفحات» table with a «الحالة» column; the three pages marked written.
- `specs/003-documentation/documentation-roadmap.md`: ticks, a Status line for each of the 3 tasks, status line (370 / 536, next step 37).

**Checks run**: every «…» sentence in the three pages was searched in the Next.js and Django sources (all found; composed ones — f-strings with `TITLE_MAX` / `BODY_MAX`, the scheduled e-mail subject and body, template literals such as «لا تقارير تطابق «…»» and «أُدرج الإشعار للإرسال إلى … مشترك.» — checked piece by piece; plan-feature and permission labels from `plan-features.md` and `permissions-matrix.md`). The 42-report table was checked against `reports_registry.py` via m25 §4.2 (36 available, 5 not yet available, 1 coming soon; 22 exportable available reports). Every relative link and in-page anchor resolves (screenshot files excepted). No application code was changed; tests were not run.

**Discrepancies found — roadmap vs code**
1. DOC-425: the audience is given as `reports.view` / `reports.sales.view`; Django opens a report on its own registry key and never checks `reports.view`, while the UI adds `reports.view` to every report and maps 20 of the 42 codes to another key — 3 stricter (`store_overview`, `currencies` → `reports.profit.view`; `audit_log` → `reports.staff_performance.view`) (m25 §8.3, repeated).
2. DOC-426: exports "keep the location filter" — only through `export_table`; the `orders` export uses the legacy builder and ignores `location` and `compare`, with ten fixed columns (m25 §6.3, repeated).
3. DOC-426: the «export ready» notification "to the requester" is derived by sync (≤ every 20 s), also for failed jobs (titled «فشل التصدير»); owner and scheduled jobs go to the owner, staff jobs only to that staff member (m25 §6.5, repeated).
4. DOC-426: the exports list is `/dashboard/reports/exports`, not `/reports/exports`.

**Discrepancies found — code vs code (likely defects or gaps)**
5. Reports: «تحديث بيانات اليوم» is shown on every core report, but the refresh needs `reports.sales.view` (`inventory_overview` is core with `reports.inventory.view`).
6. Reports: the «تقارير إضافية تتطلب صلاحيات» note counts reports hidden by the `inventory` plan feature, also for the owner; Django does not enforce that feature.
7. Schedules: the screen and the sidebar entry are gated on `reports.view`; every schedules route needs `reports.export`.
8. Schedules: the dialog lists every available report; the server also needs `export_enabled` and answers «هذا التقرير غير متاح بعد.» for e.g. `best_sellers`.
9. Schedules: the dialog says «… في الساعة 7 صباحاً بتوقيت المتجر.» (true of the mock's 04:00 UTC); Django sends at 03:00 UTC (Beat timezone unconfirmed, m25 §10).
10. Range: the too-long message «… قلّص النطاق أو صدّره كاملاً.» invites an export of more than 366 days, which is accepted and then fails.
11. Known from m25 §10, now stated as user limits: scheduled reports send CSV for the last 30 days with no filters, name the report by its code, carry a relative link, and set `last_sent_at` even if the mail or the export fails; `monthly` = 30 days; subscriptions are store-wide; cleanup turns `failed` into `expired`.

## 2026-10-28 — Official Step 35 · M-3 Merchant core · 2.13 Settings, staff, domains & integrations manuals (DOC-387 → DOC-397)

**Verified first**: the Step 35 row of `execution-plan.md` reads Milestone **M-3** (Merchant core), subsection "2.13 Settings, staff, domains & integrations manuals", DOC-387 → 397, 11 tasks, output `12-*` guides. Only the roadmap subsection `### 2.13 Settings, staff & permissions, domains & integrations` was read, with `docs/README.md`, `docs/glossary.md`, `docs/guides/_style-guide.md`, `docs/guides/_glossary.md` and `docs/_templates/guide-page.md`. Sources: `src/features/{settings,staff,integrations}/**`, `src/features/dashboard-shell/navigation.ts`, `src/features/storefront/components/{store-footer,tracking-scripts}.tsx`, `src/lib/schemas/money.ts`, the app route folders, and Django `api/views_{settings,staff,integrations}.py`, `products/services/{settings,staff,permission_resolver,behavior,audit,domain,integrations,webhook,order_approval,booking}_service.py` and `products/models/store_settings.py`, against the Track 1 pages `m34-store-settings.md`, `m18-staff-permissions.md`, `m19-domains-integrations.md`.
**Ticked**: DOC-387 → DOC-397 (11 tasks). Roadmap status is now 367 / 536; next is official Step 36 (2.16 Reports manuals, DOC-425 → 427).
**Left open**: the 25 new screenshots are registered in `docs/guides/_assets/shots.json` but **not captured** — the device shell was unavailable (files were staged, written in the cloud workspace and committed back); `staff-members-3` creates one mock member and three entries need fixture checks (noted in `_screenshots.md`).

**Added** (Arabic, RTL, from `docs/_templates/guide-page.md` and `docs/guides/_style-guide.md`)
- `docs/guides/merchant/12-settings-staff-integrations/settings-identity-contact-policies.md` (DOC-387)
- `docs/guides/merchant/12-settings-staff-integrations/settings-currency-seo.md` (DOC-388)
- `docs/guides/merchant/12-settings-staff-integrations/staff-members.md` (DOC-389)
- `docs/guides/merchant/12-settings-staff-integrations/roles-and-assignments.md` (DOC-390)
- `docs/guides/merchant/12-settings-staff-integrations/sessions-tokens-devices-roster.md` (DOC-391)
- `docs/guides/merchant/12-settings-staff-integrations/approvals.md` (DOC-392)
- `docs/guides/merchant/12-settings-staff-integrations/audit-and-alerts.md` (DOC-393)
- `docs/guides/merchant/12-settings-staff-integrations/custom-domain.md` (DOC-394)
- `docs/guides/merchant/12-settings-staff-integrations/tracking-pixels.md` (DOC-395)
- `docs/guides/merchant/12-settings-staff-integrations/webhooks.md` (DOC-396)
- `docs/guides/merchant/12-settings-staff-integrations/integrations-status.md` (DOC-397)

**Changed**
- `docs/guides/_assets/shots.json`: 25 new `merchant/12-settings-staff-integrations/*` entries (merchant session; staff #2, webhook endpoint 1 and a custom domain from the mocks).
- `docs/guides/_screenshots.md`: §7 rows and a hidden step-35 note.
- `docs/guides/_glossary.md`: §2 gains التعيين، الدور النظامي والمخصص، كلمة المرور المؤقتة، إنهاء الخدمة، الرمز الشخصي، جدول العمل، سجل التدقيق، التنبيه السلوكي; §7 gains النطاق الخاص، نقطة النهاية (Webhooks)، أدوات التتبع.
- `docs/guides/merchant/12-settings-staff-integrations/README.md`: the eleven pages marked written.
- `specs/003-documentation/documentation-roadmap.md`: ticks, a Status line for each of the 11 tasks, status line (367 / 536, next step 36).

**Checks run**: every «…» sentence in the eleven pages was searched in the Next.js and Django sources (all found; composed ones — f-strings, template literals and JSX split by `<Mono>` — checked piece by piece; permission and role names from the seeds via `permissions-matrix.md`; the image-pixel sentence and the roster login refusal from `m34`/`staff-login.md`, verified in steps 27 and 14). Every relative link and in-page anchor resolves. No application code was changed; tests were not run.

**Discrepancies found — roadmap vs code**
1. DOC-387: the pending-payment orders count is returned by the settings read but no settings screen shows it.
2. DOC-389: self-termination is refused with `400`, not the `403` self-edit rule (step 27, repeated).
3. DOC-390: overrides can only be created global; per-location overrides exist in the model but not in the API (step 27, repeated).
4. DOC-392: `refund` approvals have no creator and approving them executes nothing; escalation is never set (step 27, repeated).
5. DOC-393: the verify button is «التحقق من سلامة السجل», not «تحقق من السلسلة».

**Discrepancies found — code vs code (likely defects or gaps)**
6. Settings: the contact section links «إدارة النطاقات» to `/dashboard/domains`, which does not exist (the screen is `/dashboard/settings/domains`).
7. Settings: text-section editing is granted in the UI by role name («مدير المتجر» / «مدير الفرع»), while the server checks `catalog.manage`.
8. Staff: the empty list says staff log in with a verification code; the trusted-devices empty state promises one too — staff log in with phone + password only.
9. Staff: overrides are enabled on `staff.manage` (server: `staff.manage_assignments`); ending sessions on `staff.manage` (server: `staff.view_sessions`); «تعليم كمقروء» on `staff.manage` (server: `staff.view`).
10. Approvals: only the owner or `staff.manage` may decide in the UI, while the approver-role holder may too; the note is labelled optional but a rejection without one is refused.
11. Roster: an empty grid says «لن يستطيع الدخول في أي يوم» but does not restrict (step 14, repeated).
12. Webhooks: the screen promises up to 5 retries; the engine makes 3 attempts in total.
13. M19 screens: the «قيد التكامل» tag («العقد الخلفي غير متاح بعد — البيانات تجريبية») still shows on domains, webhooks, integrations and tracking although Django serves them.

## 2026-10-28 — Official Step 34 · M-3 Merchant core · 2.11 Shipping & Sharwa Ship + 2.12 Courier app guide (DOC-371 → DOC-386)

**Verified first**: the Step 34 row of `execution-plan.md` reads Milestone **M-3** (Merchant core), subsection "2.11 Shipping & Sharwa Ship + 2.12 Courier app guide", DOC-371 → 386, 16 tasks, outputs `11-*` guides and `docs/guides/courier/`. Only the roadmap subsections `### 2.11 Shipping & Sharwa Ship for merchants` and `### 2.12 Courier app guide` were read, with `docs/README.md`, `docs/glossary.md`, `docs/guides/_style-guide.md`, `docs/guides/_glossary.md` and `docs/_templates/guide-page.md`. Sources: `src/features/shipping/**`, `src/features/shipping/sharwa-ship/**`, `src/features/courier/**`, `src/features/dashboard-shell/navigation.ts`, the shipping and courier mocks, and Django `api/views_shipping.py`, `api/views_sharwa_ship.py`, `api/views_courier.py`, `api/views.py`, `products/services/{shipping,sharwa_ship_api,courier_app,cod_collection,shipment_state,shipping_billing,shipment_weight,zone_routing,carrier,notification}_service.py` and `products/carriers/{aramex,smsa,base}.py`, against the Track 1 pages `m15-shipping.md`, `m38-courier-app.md`, `m39-sharwa-ship.md`.
**Ticked**: DOC-371 → DOC-386 (16 tasks). Roadmap status is now 356 / 536; next is official Step 35 (2.13 Settings, staff, domains & integrations manuals, DOC-387 → 397).
**Left open**: (1) the 29 new screenshots are registered in `docs/guides/_assets/shots.json` but **not captured** — the device shell was unavailable (files were staged, written in the cloud workspace and committed back); entries to check are noted in `_screenshots.md`.

**Added** (Arabic, RTL, from `docs/_templates/guide-page.md` and `docs/guides/_style-guide.md`)
- `docs/guides/merchant/11-shipping/shipping-settings.md` (DOC-371)
- `docs/guides/merchant/11-shipping/delivery-methods.md` (DOC-372)
- `docs/guides/merchant/11-shipping/pickup-locations.md` (DOC-373)
- `docs/guides/merchant/11-shipping/delivery-providers.md` (DOC-374)
- `docs/guides/merchant/11-shipping/carriers.md` (DOC-375)
- `docs/guides/merchant/11-shipping/zones-packaging-sla.md` (DOC-376)
- `docs/guides/merchant/11-shipping/zone-review-and-edge-cases.md` (DOC-377)
- `docs/guides/merchant/11-shipping/address-and-convert-to-pickup.md` (DOC-378)
- `docs/guides/merchant/11-shipping/sharwa-ship-issue-waybill.md` (DOC-379)
- `docs/guides/merchant/11-shipping/sharwa-ship-shipments.md` (DOC-380)
- `docs/guides/merchant/11-shipping/awb-queue-and-rate-cards.md` (DOC-381)
- `docs/guides/merchant/11-shipping/courier-supervision.md` (DOC-382)
- `docs/guides/courier/11-shipping/sign-in-and-home.md` (DOC-383)
- `docs/guides/courier/11-shipping/shifts.md` (DOC-384)
- `docs/guides/courier/11-shipping/shipments.md` (DOC-385)
- `docs/guides/courier/11-shipping/custody.md` (DOC-386)

**Changed**
- `docs/guides/_assets/shots.json`: 29 new entries — 22 `merchant/11-shipping/*` (merchant session) and 7 `courier/11-shipping/*` (mobile; staff session = agent 1, manager session for the no-profile screen). Fixtures: method 1 official, provider 1, waybill 716 with children, courier shipment 710.
- `docs/guides/_screenshots.md`: §7 rows and a hidden step-34 note (registered, not captured, entries to check).
- `docs/guides/_glossary.md`: §4 gains البوليصة الرئيسة والفرعية، حالة التحصيل، طريقة التوصيل، الناقل الخارجي، منطقة شروة شيب، النطاق المحظور، قاعدة SLA، ملف التغليف، الوزن للاحتساب، الحالات الحدّية، طابور AWB، «الطابور» (تطبيق المندوب)، المبلغ عند الاستلام، إعادة الإسناد الطارئة.
- `docs/guides/merchant/11-shipping/README.md`, `docs/guides/courier/11-shipping/README.md`: heading «الصفحات», «الحالة» column; all pages marked written. `docs/guides/courier/README.md`: "planned" wording removed and «الوردية» corrected to «المناوبة» (the courier term, glossary §5).
- `specs/003-documentation/documentation-roadmap.md`: ticks, a Status line for each of the 16 tasks, status line (356 / 536, next step 35).

**Checks run**: every «…» sentence in the sixteen pages was searched in the Next.js and Django sources (all found; composed ones — template literals, f-strings and JSX split by `<Mono>` — checked piece by piece; the two marketplace issue sentences come from `m39-sharwa-ship.md` §4.2, verified in step 26; role, permission and plan-feature names from `permissions-matrix.md` and `plan-features.md`). Every relative link resolves to an existing page or a roadmap Output. The two Mermaid diagrams render with `mmdc`. No application code was changed; tests were not run.

**Discrepancies found — roadmap vs code**
1. DOC-374: staff-options is not filtered — terminated members and members linked elsewhere are listed; the refusal comes at save (step 25, repeated in the guide).
2. DOC-375: the SMSA connection test is a stub that always fails and flips the carrier to «خطأ اتصال» for 24 h (inventory A.13).
3. DOC-379: the split into master + children happens in Django, but the mock refuses a heavy order and the sheet suggests splitting instead; only the order's first sub-shipment is issued.
4. DOC-380: the screen has no date filter although the API accepts `from`/`to`.
5. DOC-381: the AWB queue lists every status, not failed only (step 26).
6. DOC-385: `geo_required` is returned but not in the app's rejection list, so a delivery without location shows only «رُفض الحدث.» / «رُفض التسليم.» (step 26).

**Discrepancies found — code vs code (likely defects or gaps)**
7. Delivery methods: both shipping screens open with `shipping_settings`, while the methods routes need `shipping_companies`.
8. Providers: the companies tab opens with `shipping_companies`, while every providers route needs `shipping_providers`.
9. Carriers: the API can switch back to the platform's shared account (`credential_source: "platform_shared"`), but the screen never sends it.
10. SLA: the screen says nothing is tracked without rules («لا قواعد SLA — لن تُرصد الشحنات المتأخرة»), but the 72 h default still feeds «تجاوز SLA».
11. Courier handover: the result line labels the receiver's total balance after the handover (raw decimal, no currency) as «العهدة المنقولة».
12. Courier delivery: an all-rejected delivery is announced as «سيُسجَّل كتسليم فاشل», but the shipment still moves to «تم التسليم» with 0 collected.
13. Courier custody: the API pages 50 entries, but the app never asks for page 2.
14. Custody transfers (handover and emergency reassignment) write their ledger pair in SAR whatever the store currency (step 26, repeated in two guides).

## 2026-10-28 — Official Step 33 · M-3 Merchant core · 2.10 Inventory, locations & procurement manuals (DOC-359 → DOC-370)

**Verified first**: the Step 33 row of `execution-plan.md` reads Milestone **M-3** (Merchant core), subsection "2.10 Inventory, locations & procurement manuals", DOC-359 → 370, 12 tasks, output `10-*` guides. Only the roadmap subsection `### 2.10 Inventory, locations & procurement (المخزون والمواقع والمشتريات)` was read.
**Ticked**: DOC-359 → DOC-370 (12 tasks). Roadmap status is now 340 / 536; next is official Step 34 (2.11 Shipping & Sharwa Ship + 2.12 Courier app guide, DOC-371 → 386).
**Left open**: (1) the 22 new screenshots are registered in `docs/guides/_assets/shots.json` but **not captured** — the device shell was unavailable (files were staged, written in the cloud workspace and committed back); three entries need checking before the run (see the hidden step-33 note in `_screenshots.md`).

**Added** (Arabic, RTL, from `docs/_templates/guide-page.md` and `docs/guides/_style-guide.md`)
- `docs/guides/merchant/10-inventory-locations-procurement/inventory-hub.md` (DOC-359)
- `docs/guides/merchant/10-inventory-locations-procurement/adjust-stock.md` (DOC-360)
- `docs/guides/merchant/10-inventory-locations-procurement/movements-and-reservations.md` (DOC-361)
- `docs/guides/merchant/10-inventory-locations-procurement/writeoffs.md` (DOC-362)
- `docs/guides/merchant/10-inventory-locations-procurement/export-inventory.md` (DOC-363)
- `docs/guides/merchant/10-inventory-locations-procurement/locations.md` (DOC-364)
- `docs/guides/merchant/10-inventory-locations-procurement/multi-location-mode.md` (DOC-365)
- `docs/guides/merchant/10-inventory-locations-procurement/location-inventory.md` (DOC-366)
- `docs/guides/merchant/10-inventory-locations-procurement/location-staff.md` (DOC-367)
- `docs/guides/merchant/10-inventory-locations-procurement/routing-rules.md` (DOC-368)
- `docs/guides/merchant/10-inventory-locations-procurement/suppliers.md` (DOC-369)
- `docs/guides/merchant/10-inventory-locations-procurement/purchase-orders.md` (DOC-370)

**Changed**
- `docs/guides/_assets/shots.json`: 22 new `merchant/10-inventory-locations-procurement/*` entries (locations 1 and 2, PO 22, supplier 1 from `src/mocks/locations/state.ts` and `src/mocks/procurement/state.ts`; `inventory-hub-1` and `locations-2` also on mobile).
- `docs/guides/_screenshots.md`: §7 rows and a hidden step-33 note (registered, not captured, three entries to check).
- `docs/guides/_glossary.md`: §5 gains الفعلي والمتاح، حجر الموقع، حد التنبيه، حد الطلب، سجل الحركات، طلب الإعدام، الوحدة المسلسلة، الدور التشغيلي، قاعدة التوجيه، المورد، أمر الشراء.
- `docs/guides/merchant/10-inventory-locations-procurement/README.md`: heading «الصفحات», «الحالة» column; all twelve pages marked written.
- `specs/003-documentation/documentation-roadmap.md`: ticks, a Status line for each of the 12 tasks, status line (340 / 536, next step 34).

**Checks run**: every «…» sentence in the twelve pages was searched in the Next.js and Django sources (all found; composed ones — template literals, f-strings and JSX split by `<Mono>` — checked piece by piece; role, permission and plan-feature names come from the permissions-matrix and plan-features guides); every relative link resolves on the device or is a roadmap-listed path; the 22 manifest entries use `data-testid` selectors present in the components (two use text selectors and are flagged); the two state diagrams render with `mmdc`. Discrepancies sit in hidden `<!-- ⚠️ Discrepancy — … -->` comments per `docs/guides/_style-guide.md` §3, with a «قيد معروف» box where the reader is affected.

**Discrepancies found — roadmap vs code**
1. DOC-362: the approver falls back to the first active role when «مدير المتجر» does not exist, and deciding a write-off needs plan feature `staff_rbac`, off by default — requests can be created but not decided on such stores (both from step 23, repeated in the guide).
2. DOC-366: quarantine is capped at on-hand − reserved as stated, but the catalog mirror ignores quarantine (step 23).
3. DOC-367: the API replaces the role on re-assignment, but the dashboard picker hides already-assigned staff, so the UI way to change a role is remove then assign.

**Discrepancies found — code vs code (likely defects or gaps)**
4. Multi-location stock rows: `adjust` refuses a unit without a `LocationInventory` row, the location tab lists only existing rows and has no add control, yet the empty state says «الكميات تُنشأ عند أول تعديل أو استلام إلى هذا الموقع.» and the hub hint says «عيّنه من صفحة الموقع»; only PO receiving creates the row.
5. Multi-location mode: the settings confirm says turning on moves current stock to the default location; `set_multi_location` only flips the flag. The activation screen hard-codes «WH-01 المستودع الرئيسي».
6. Routing: the screens say orders are routed automatically, but `location_routing_service` is "غير مُفعَّل تلقائياً" and no checkout/order/POS service calls it.
7. Routing: a rule pointing to an inactive location is shown as skipped («تُتجاوز القاعدة»), but `preview_routing` still returns that location.
8. Suppliers: the delete dialog counts only non-cancelled orders («ألغِ الأوامر…» / «لا أوامر مرتبطة. الحذف نهائي.»), while any order — cancelled included — blocks the delete (409).
9. Movements: a PO reference reads `PO-<id>` unpadded (`PO-3`) while the PO number is `PO-0003`.
10. Write-offs: the form lists only the first 100 products (`page_size: 100`) and shows catalog stock as «المتاح الآن» while the server checks the location row.
11. Adjust panel: in multi-location mode without a location filter, the «النتيجة» preview is computed from catalog stock, not from the selected location's on-hand.

## 2026-10-28 — Official Step 32 · M-3 Merchant core · 2.7 Marketing, design & partners manuals (DOC-341 → DOC-350)

**Verified first**: the Step 32 row of `execution-plan.md` reads Milestone **M-3** (Merchant core), subsection "2.7 Marketing, design & partners manuals", DOC-341 → 350, 10 tasks, output `07-*` guides. Only the roadmap subsection `### 2.7 Marketing, store design & partners (التسويق والتصميم والمسوّقون)` was read.
**Ticked**: DOC-341 → DOC-350 (10 tasks). Roadmap status is now 328 / 536; next is official Step 33 (2.10 Inventory, locations & procurement manuals, DOC-359 → 370).
**Left open**: (1) the 23 new screenshots are registered in `docs/guides/_assets/shots.json` but **not captured** — the device shell was unavailable (files were staged, written in the cloud workspace and committed back); (2) no manifest entry yet for the theme conflict banner, the settings «شريط الإعلانات» section or the mobile design drawer.

**Added** (Arabic, RTL, from `docs/_templates/guide-page.md` and `docs/guides/_style-guide.md`)
- `docs/guides/merchant/07-marketing-design-partners/theme.md` (DOC-341)
- `docs/guides/merchant/07-marketing-design-partners/sections.md` (DOC-342)
- `docs/guides/merchant/07-marketing-design-partners/announcement-bar.md` (DOC-343)
- `docs/guides/merchant/07-marketing-design-partners/coupons.md` (DOC-344)
- `docs/guides/merchant/07-marketing-design-partners/offers.md` (DOC-345)
- `docs/guides/merchant/07-marketing-design-partners/abandoned-carts.md` (DOC-346)
- `docs/guides/merchant/07-marketing-design-partners/campaigns.md` (DOC-347)
- `docs/guides/merchant/07-marketing-design-partners/timeline-loyalty-gifting.md` (DOC-348)
- `docs/guides/merchant/07-marketing-design-partners/affiliates.md` (DOC-349)
- `docs/guides/merchant/07-marketing-design-partners/influencers.md` (DOC-350)

**Changed**
- `docs/guides/_assets/shots.json`: 23 new `merchant/07-marketing-design-partners/*` entries (offer 1, campaign 3, influencer 7 / SARA20 from `src/mocks/marketing/state.ts` and `src/mocks/affiliates/state.ts`; `abandoned-carts-1` and `affiliates-1` also on mobile).
- `docs/guides/_screenshots.md`: §7 rows and a hidden step-32 note (registered, not captured, left open).
- `docs/guides/_glossary.md`: new §10 «التسويق والتصميم» (المسودة، القالب الجاهز، القسم المفرد، شريط الإعلانات، الكوبون، العرض الترويجي، شرط التطبيق، السلة المتروكة، كوبون الاسترداد، الحملة، المسوّق، المؤثر، المستحق، العملية); «رابط الإحالة» now records the dashboard label «رابط الإحالة» ✓.
- `docs/guides/merchant/07-marketing-design-partners/README.md`: heading «الصفحات», «الحالة» column; all ten pages marked written.
- `specs/003-documentation/documentation-roadmap.md`: ticks, a Status line for each of the 10 tasks, status line (328 / 536, next step 33).

**Checks run**: every «…» sentence in the ten pages was searched in the Next.js and Django sources (all found; the composed ones — template literals and f-strings with a count, a name, an amount or a limit, and JSX split by `<span>`/`<Mono>` — were checked piece by piece; plan-feature and permission names come from the plan-features and permissions-matrix guides; «هدية إلى» from the step-15 tracking guide); every relative link resolves on the device or is a roadmap-listed path; the 23 manifest entries use `data-testid` selectors present in the components; the campaign state diagram renders with `mmdc`. Discrepancies sit in hidden `<!-- ⚠️ Discrepancy — … -->` comments, the Track 2 form set by `docs/guides/_style-guide.md` §3, with a «قيد معروف» box where the reader is affected.

**Discrepancies found — roadmap vs code**
1. DOC-341: Django clears the logo on `null`/`''`, but the dashboard offers no way to remove a published logo (only replace it).
2. DOC-342: "8 MB per save" — each section is published in its own request, so the 8 MB bound applies to the new images of one section; an over-size body is a generic 400. `limit` 1–50 applies to every type that carries it (as in step 21).
3. DOC-345: the offers screen and its sidebar item are gated on `promotions`, every Django offers route on `coupon`.
4. DOC-345: priority only orders offers; `calculate_promotional_discount` applies and sums every eligible offer (capped at the subtotal).
5. DOC-347: the dashboard disables every unconnected channel, so SMS/e-mail campaigns cannot even be drafted (the API would accept the draft and refuse the send).
6. DOC-348: the timeline screen has no date filter (`?from&to` exists only in the API).
7. DOC-348: loyalty and gifting do not appear in the storefront config (steps 06, 16, 21), so checkout hides both in live mode.
8. DOC-349: a click is recorded once per new code per visitor cookie (30 days) and once per tab session in the storefront, not "once per visitor session".
9. DOC-350: nothing in the dashboard or API links a coupon to an influencer; «إنشاء كوبون لهذا المؤثر» opens a plain coupon form (the `?influencer=` parameter is ignored) and the coupon API has no influencer field.
10. DOC-350: staff sessions read the influencer screens (writes are owner-only); the roadmap says owner.

**Discrepancies found — code vs code (likely defects or gaps)**
11. Coupons and offers: the forms label amounts «(ر.س)», but Django stores and evaluates them in the store display currency (`StoreSetting.currency`, marketing_service and CheckoutService); the Track 1 page `m13-marketing.md` §1 also says "stored in SAR" — to correct in Track 4.
12. Coupons: the influencer link goes to `/dashboard/influencers/<id>` (unbuilt catch-all) instead of `/dashboard/marketing/influencers/<id>`.
13. Abandoned carts: after two reminders the sheet says «أُرسل التذكيران. يمكن إرسال تذكير إضافي يدوياً.» and keeps the button, while the server refuses a third reminder.
14. Abandoned carts: the reminder-2 hint says «من وقت ترك السلة.», the engine measures from the first reminder (`last_reminder_sent_at`).
15. Offers: buy X get Y rewards only reward units already in the cart; nothing tells the buyer to add the free product.
16. Influencers: «إيقاف» does not stop attribution — `create_influencer_sale` checks the coupon, not `influencer.is_active` (affiliates do check it), yet the shared dialog says new orders stop counting.
17. Gifting: the screen says the buyer sees «أرسله كهدية»; checkout says «هذا الطلب هدية».
18. Offers: the image hint lists jpg/png/webp only; jpeg and gif are accepted.

## 2026-10-28 — Official Step 31 · M-3 Merchant core · 2.6 Customers/wallets + 2.8 Finance manuals (DOC-335 → DOC-340, DOC-351 → DOC-356)

**Verified first**: the Step 31 row of `execution-plan.md` reads Milestone **M-3 Merchant core** (not M-4, as the step prompt said), subsection "2.6 Customers/wallets + 2.8 Finance manuals", DOC-335 → 340 and DOC-351 → 356, 12 tasks, outputs `06-*` and `08-*` guides. Only the roadmap subsections `### 2.6 Customers, wallets & loyalty (العملاء والمحافظ والولاء)` and `### 2.8 Finance (المالية: المدفوعات والمحفظة والمصروفات)` were read.
**Ticked**: DOC-335 → DOC-340 and DOC-351 → DOC-356 (12 tasks). Roadmap status is now 318 / 536; next is official Step 32 (2.7 Marketing, design & partners manuals, DOC-341 → 350).
**Left open**: (1) the 18 new screenshots are registered in `docs/guides/_assets/shots.json` but **not captured** — the device shell was unavailable (files were staged, written in the cloud workspace and committed back); (2) no manifest entry yet for the profile tabs other than reviews, the gateway credential page on mobile, or the withdrawal confirm dialog.

**Added** (Arabic, RTL, from `docs/_templates/guide-page.md` and `docs/guides/_style-guide.md`)
- `docs/guides/merchant/06-customers-wallets/customers-list.md` (DOC-335)
- `docs/guides/merchant/06-customers-wallets/customer-profile.md` (DOC-336)
- `docs/guides/merchant/06-customers-wallets/cod-control.md` (DOC-337)
- `docs/guides/merchant/06-customers-wallets/export-customers.md` (DOC-338)
- `docs/guides/merchant/06-customers-wallets/customer-wallets.md` (DOC-339)
- `docs/guides/merchant/06-customers-wallets/loyalty-points.md` (DOC-340)
- `docs/guides/merchant/08-finance/payment-gateways.md` (DOC-351)
- `docs/guides/merchant/08-finance/payment-methods.md` (DOC-352)
- `docs/guides/merchant/08-finance/payout-accounts.md` (DOC-353)
- `docs/guides/merchant/08-finance/merchant-wallet.md` (DOC-354)
- `docs/guides/merchant/08-finance/platform-dues.md` (DOC-355)
- `docs/guides/merchant/08-finance/expenses.md` (DOC-356)

**Changed**
- `docs/guides/_assets/shots.json`: 18 new `merchant/06-customers-wallets/*` and `merchant/08-finance/*` entries (fixtures 967770841802, 967770000099, customer wallet 1; `expenses-1` also on mobile).
- `docs/guides/_screenshots.md`: §7 rows and a hidden step-31 note (registered, not captured, left open).
- `docs/guides/_glossary.md`: §1 gains الشريحة and ثقة الدفع عند الاستلام; §3 gains حساب الاستلام، طلب السحب، بوابة الدفع، التحويل اليدوي، المصروفات التشغيلية, and «المستحقات للمنصة» now says they are collected from the Sharwa Pay wallet.
- `docs/guides/merchant/06-customers-wallets/README.md`: heading «الصفحات», «الحالة» column; six pages marked written. `docs/guides/merchant/08-finance/README.md`: six rows marked written.
- `specs/003-documentation/documentation-roadmap.md`: ticks, a Status line for each of the 12 tasks, status line (318 / 536, next step 32).

**Checks run**: every «…» sentence in the twelve pages was searched in the Next.js and Django sources (all found; the composed ones — toasts and messages built with a ternary, a name, an amount or a count, and Python strings split over two literals — were checked piece by piece; long server messages are shortened with «…» only at their end); every relative link and anchor resolves; the 18 manifest entries use `data-testid` selectors present in the components.

**Discrepancies found — roadmap vs code**
1. DOC-335: the customers screen and its sidebar item «تقرير العميل» are gated by the plan feature `customer_report`; Django's M07 routes check no feature. The segment count is the campaign resolver and can differ from the list's own segment rows (step 20).
2. DOC-336: there is no COD tab — the COD trust block sits above the six tabs (orders, wallet, points, wishlist, reviews, notes).
3. DOC-337: the automatic reason is «أُوقف تلقائياً بعد {refusals} مرات رفض استلام.» (step 20); the "no change" conflict has two texts and is checked after the reason.
4. DOC-338: exporting needs `customers.export` («تصدير بيانات العملاء»), not `customers.view`; the button is not rendered without it and «كاشير» cannot export.
5. DOC-339: a Saudi `05…` number is refused when creating a wallet (step 20); nothing in the API or dashboard can disable a wallet, although «معطّلة» is displayed and enforced.
6. DOC-340: only a **full** refund claws points back (step 30).
7. DOC-351: the dashboard credential form refuses a partial save that Django accepts; only the list drops gateways outside the plan (step 22); `http://` passes the URL check whose message says https:// (step 22).
8. DOC-352: COD has no switch of its own — the storefront offers it only when **manual payment** is enabled (`checkout_service.quote_checkout`, `storefront_checkout_service.payment_options`) and no upfront is due.
9. DOC-354: the `commission` kind is never written; there is no HTTP route to decide a withdrawal and the admin action sets no reason (step 22).
10. DOC-355 / DOC-356: no plan feature in Django, but the dues screen and the sidebar group «محفظة المتجر» require `merchantwallet` (step 10).
11. DOC-356: the ledger column is «أدخله» and the owner's rows read «المالك» (roadmap: «أُدخل بواسطة», owner unnamed).

**Discrepancies found — code vs code (likely defects or gaps)**
12. Loyalty: points are earned at order placement (`award_points_for_order` in checkout), while three UI texts say they come «من الطلبات المكتملة».
13. Customer notes are writable with `customers.view` and are not audited; the wallet tab's actor/reference differ from the M35 ledger (both step 20).
14. Gateways: the whole «ربط بوابات الدفع» section renders only with `payment_gateways`, so a plan with `local_wallets` alone cannot reach Jeeb; the owner-only text differs between Django («المدفوعات والمحفظة مقصورة على مالك المتجر.») and the UI («المدفوعات والمحفظة وحسابات الاستلام مقصورة على مالك المتجر.»).
15. Settings «الدفع»: shows «لن يستطيع المشترون الدفع إلا عند الاستلام.» when manual payment and Sharwa Pay are off — then COD is not offered either and only a gateway remains.
16. The payments page needs one of `payment_gateways` / `bank_transfers` / `local_wallets`, while `store/payments/` has no plan feature.
17. Payout accounts: UI limits 80/40/120 vs Django 100/150/150; the UI rejects Arabic digits that Django normalises; the wallet tab follows `local_wallets` while every route needs `bank_transfers`; the storefront mixes banks and wallets in one order; the preview says «بانتظار الدفع» (the status label is «بانتظار تأكيد الدفع»).
18. Dues: «تُسجَّل العمولة عند كل طلب مدفوع إلكترونياً.» while `commission_service` records a commission for any order reaching the credit hook; «تُحصَّل من رصيد محفظتك» under «محفظة المتجر» means the Sharwa Pay wallet; with commissions off the tab hides existing pending rows.
19. Expenses: the create has no idempotency key, so a resend after a network error can duplicate an entry.

## 2026-10-28 — Official Step 30 · M-3 Merchant core · 2.4 Orders & returns manuals (DOC-310 → DOC-317)

**Verified first**: the Step 30 row of `execution-plan.md` reads Milestone **M-3 Merchant core** (not M-4, as the step prompt said), subsection "2.4 Orders & returns manuals", DOC-310 → 317, 8 tasks, output `docs/guides/merchant/04-orders-returns/`. Only the roadmap subsection `### 2.4 Orders & returns (الطلبات والمرتجعات)` was read.
**Ticked**: DOC-310 → DOC-317 (8 tasks). Roadmap status is now 306 / 536; next is official Step 31 (2.6 Customers/wallets + 2.8 Finance manuals, DOC-335 → 340, DOC-351 → 356).
**Left open**: (1) the 15 new screenshots are registered in `docs/guides/_assets/shots.json` but **not captured** — the device shell was unavailable (files were staged, written in the cloud workspace and committed back); (2) no manifest entry for a scan result line (the pipeline has no Enter-key step) or the return conflict panel.

**Added** (Arabic, RTL, from `docs/_templates/guide-page.md` and `docs/guides/_style-guide.md`)
- `docs/guides/merchant/04-orders-returns/orders-list.md` (DOC-310)
- `docs/guides/merchant/04-orders-returns/order-detail.md` (DOC-311)
- `docs/guides/merchant/04-orders-returns/order-statuses.md` (DOC-312)
- `docs/guides/merchant/04-orders-returns/payment-review.md` (DOC-313)
- `docs/guides/merchant/04-orders-returns/manual-order.md` (DOC-314)
- `docs/guides/merchant/04-orders-returns/refunds.md` (DOC-315)
- `docs/guides/merchant/04-orders-returns/returns.md` (DOC-316)
- `docs/guides/merchant/04-orders-returns/rma.md` (DOC-317)

**Changed**
- `docs/guides/_assets/shots.json`: 15 new `merchant/04-orders-returns/*` entries (order 10480, return 5001, RMA-804 from `src/mocks/orders/state.ts` and `src/mocks/returns/state.ts`).
- `docs/guides/_screenshots.md`: §7 rows and a hidden step-30 note (registered, not captured, left open).
- `docs/guides/_glossary.md`: §4 «الطلبات والشحن» gains الحالة المالية، حالة التنفيذ، مراجعة الدفع، الطلب اليدوي، مسودة الجملة، RMA، الحجر.
- `docs/guides/merchant/04-orders-returns/README.md`: heading «الصفحات», «الحالة» column; all eight pages marked written.
- `specs/003-documentation/documentation-roadmap.md`: ticks, a Status line for each of the 8 tasks, status line (306 / 536, next step 31).

**Checks run**: every «…» sentence in the eight pages was searched in the Next.js and Django sources (all found; the composed ones — toasts and messages with an id, an amount, a name or a status inserted by an f-string or template literal, and messages split over two Python string literals — were checked piece by piece, and long server messages are shortened with «…» only at their end); every relative link resolves on the device; the 15 manifest entries use `data-testid` selectors that exist in the components.

**Discrepancies found — roadmap vs code**
1. DOC-310: `sales_channel` has four values (online «المتجر», pos «نقطة بيع», b2b_draft «مسودة جملة», phone «هاتفي»), not seven; chat, marketplace, dropship and booking orders show as «المتجر» and are told apart by «المصدر».
2. DOC-311: only pickup conversion and the gift message can be edited; RMA events are not on the order timeline (step 19).
3. DOC-312: the seeded «مكتمل» has `marks_completed` false in Django (step 19).
4. DOC-313: rejecting a payment cancels and restocks only under `payment_review`; rejecting `awaiting_payment` / `pending_payment` returns the order to `pending_payment` with payment `failed` and stock still reserved.
5. DOC-314: B2B drafts are created from the same manual-order form (`b2b_draft`) when the member holds `orders.create_b2b`, and need a staff session (the owner is refused); only the approval is a separate screen.
6. DOC-315: the order refund methods are wallet «إلى محفظة العميل», sharwa_pay «شروة باي», manual «يدوي (نقداً/تحويل)» and wallet_credit «رصيد محفظة»; "store credit" is a return method that maps to wallet_credit.
7. DOC-315: `CashLiquidityError` is raised only when a cash **return** is approved; an order refund «يدوي (نقداً/تحويل)» checks no drawer.
8. DOC-315: the refunds log shows no actor column although the API returns `actor`; the screen is `/dashboard/returns/refunds-log` (not `/dashboard/orders/refunds`) and needs the plan feature `refunds`; affiliate/influencer claw-back is derived in `partners_service`, not a refund step, and a partial refund does not change it.
9. DOC-316: the dashboard requires «موقع إعادة المخزون» whenever a line restocks, so Django's fallback to the fulfilment's location is never used from the UI; «إرجاع #id» is the movement note, its reference is `('return', id)` (step 19).
10. DOC-317: Django creates every RMA directly in `in_transit_back`, and the scan stores `qa_pending`; `requested`, `received_at_warehouse` and `closed` are never stored.
11. DOC-317: scan and QA accept `orders.process_returns` **or** `inventory.adjust`; list, detail and create need `orders.process_returns` only, so an `inventory.adjust`-only member («أمين مخزن») reaches the scan screen by URL only.

**Discrepancies found — code vs code (likely defects or gaps)**
12. Orders counter strip hides `pending_payment`.
13. Gift message: the dashboard counter allows 500 characters while Django caps at 300 («300 حرف على الأكثر.»).
14. Pickup conversion: the dialog says «يُلغى التوصيل ورسومه» but `delivery_fee` is not changed.
15. Fulfilment statuses: the hint for «تُحرّر المخزون» says the status cancels the order, but it only restocks; the menu labels the same flag «· تُعيد المخزون»; «طلب ملغي: أعِد تفعيله…» is a UI-only rule.
16. Payment rejection: the toast «رُفض الدفع؛ أُبلغ العميل» is shown on both reject paths, but only the review reject notifies the buyer.
17. Manual order: the sidebar entry «إنشاء طلب جديد» is gated by `orders.view` while the screen and Django need `orders.update_status`; no webhook, push or WhatsApp is sent (step 19).
18. Returns: the hint «محفظة العميل تتطلب محفظة قائمة؛ وإلا فاختر «رصيد متجر».» is the mock's rule (Django creates the wallet); the liquidity hint «غيّر الطريقة إلى محفظة العميل أو اختر موقعاً آخر.» suggests changing a method the decision cannot change; the empty state points to an «إرجاع» button the order screen does not have; the return conflict bar says «حُدِّث الطلب من مستخدم آخر»; «معتمد» and «قيد المعالجة» are never produced, so their chips stay 0 outside mock mode.
19. RMA: the mock creates new RMAs as `requested` (a fresh mock RMA cannot be scanned); the RMA strip lists statuses that stay 0; Django status and reason labels differ from the UI (received_at_warehouse «استُلم في المخزن» vs «وصل المستودع», rejected_disposal «رُفض — إتلاف/إرجاع للتاجر» vs «مرفوض/إعدام», wrong_item «منتج خاطئ» vs «صنف خاطئ», bundle_partial_return «رفض جزئي لعرض حزمة» vs «إرجاع جزئي لحزمة») and the re-scan 409 embeds the Django label; the UI tooltip names the permission «معالجة المرتجعات» while its server name is «معالجة استرجاعات الفروع».

## 2026-10-28 — Official Step 29 · M-3 Merchant core · 2.3 Catalog manuals (DOC-300 → DOC-309)

**Verified first**: the Step 29 row of `execution-plan.md` reads Milestone **M-3 Merchant core** (not M-4, as the step prompt said), subsection "2.3 Catalog manuals", DOC-300 → 309, 10 tasks, output `docs/guides/merchant/03-catalog/`. Only the roadmap subsection `### 2.3 Catalog (الكتالوج والمنتجات المتقدمة)` was read.
**Ticked**: DOC-300 → DOC-309 (10 tasks). Roadmap status is now 298 / 536; next is official Step 30 (2.4 Orders & returns manuals, DOC-310 → 317).
**Left open**: (1) the 19 new screenshots are registered in `docs/guides/_assets/shots.json` but **not captured** — the device shell was unavailable (files were staged, written in the cloud workspace and committed back); (2) three roadmap screenshots have no manifest entry: import mapping and import progress (the pipeline has no file-upload step) and the exported CSV opened in Excel (outside the browser). DOC-284, DOC-520 and DOC-522 stay open as before.

**Added** (Arabic, RTL, from `docs/_templates/guide-page.md` and `docs/guides/_style-guide.md`)
- `docs/guides/merchant/03-catalog/add-product.md` (DOC-300)
- `docs/guides/merchant/03-catalog/edit-product-and-variants.md` (DOC-301)
- `docs/guides/merchant/03-catalog/organization.md` (DOC-302)
- `docs/guides/merchant/03-catalog/bundles-and-compatibility.md` (DOC-303)
- `docs/guides/merchant/03-catalog/personalization.md` (DOC-304)
- `docs/guides/merchant/03-catalog/auctions.md` (DOC-305)
- `docs/guides/merchant/03-catalog/serials-and-formula.md` (DOC-306)
- `docs/guides/merchant/03-catalog/tier-prices.md` (DOC-307)
- `docs/guides/merchant/03-catalog/import-products.md` (DOC-308)
- `docs/guides/merchant/03-catalog/export-products.md` (DOC-309)

**Changed**
- `docs/guides/_assets/shots.json`: 19 new `merchant/03-catalog/*` entries (fixture ids 1001, 1013, 1017, 1018, 1035, 1043, 1044 from `src/mocks/catalog/seed.ts`).
- `docs/guides/_screenshots.md`: §7 rows and a hidden step-29 note (registered, not captured, left open).
- `docs/guides/_glossary.md`: §6 «المنتجات والقنوات» gains التصنيف، الماركة، الوسم، المجموعة، الشارة، القالب، السمة، المتغير، حالة المنتج، الأرقام التسلسلية، أسعار الكميات، حقول التخصيص، التسعير بالمعادلة، سجل التغييرات.
- `docs/guides/merchant/03-catalog/README.md`: «الحالة» column; all ten pages marked written.
- `specs/003-documentation/documentation-roadmap.md`: ticks, a Status line for each of the 10 tasks, status line (298 / 536, next step 30).

**Checks run**: every «…» sentence in the ten pages was searched in the Next.js and Django sources (all found; the composed ones — toasts and messages with a count, a name or a limit inserted by an f-string or template literal — were checked piece by piece); every relative link resolves or points at a roadmap path; every image has a `shots.json` entry except the three listed above; Track 2 discrepancies are HTML comments, per `_style-guide.md` §3, and those that affect the merchant are repeated in a «قيد معروف» box; Western digits; fixture data only. Nothing was run against the apps (documentation only; no Django test, `npm run lint` or `tsc`). Sources read: `features/products/**` (editor, cards, advanced panels, variants, media, import, list, schemas), `features/organization/**`, `features/pdp/{buy-box,special-pricing,auction-panel}.tsx`, `features/dashboard-shell/navigation.ts`, `mocks/catalog/seed.ts`, `mocks/storefront/extensions.ts`; Django `api/views_{products,product_extras,b2b,catalog}.py`, `api/serializers_{products,catalog}.py`, `api/views.py` (B2B draft pricing), `products/cart.py`, `products/services/{product,variant,product_extras,product_import,tier_pricing,b2b_api,catalog_org,storefront_product,storefront_cart,pos,search}_service*.py`, `suppliers/feed_reader.py`, migrations `0143`, `0144`, `0210`; and the Track 1 pages `m04-products.md`, `m05-organization.md`, `m37-advanced-products.md`, `m09`, `m10`.

**Discrepancies found — roadmap vs code**
1. DOC-300: a template is never mandatory — the editor requires name, price, category and unit (Django only name and price); editor images are 5 MB multipart files sent one per request, 8 MB is the request bound (both already in step 07).
2. DOC-301: «archived products sort last» is true of the command-palette search, not of the products list search; «تطبيق على منتجات» is one PATCH per product, so a run can partly succeed.
3. DOC-302: the storefront card shows manual badges only; the three dynamic badges appear in the dashboard editor (already in step 08).
4. DOC-303: the product page **does** send the buyer's bundle choice — `bundle_optional` and `bundle_selection` inside `personalization` (`buy-box.tsx:147-151`); the cart stores it with the line and checkout copies it to `OrderItem.personalization`, but nothing prices or shows it, and buy-now drops it. The roadmap and the Track 1 pages (`m37-advanced-products.md` §4.8 item 1, `m10-product-detail.md` §4.4) say it is not sent — those two pages should be corrected.
5. DOC-303: component PATCH and compatibility-rule DELETE write no change-log row (PATCH already in step 08).
6. DOC-305: an auction past its end closes on the next read, not by a scheduler; buy-now ends it only through a bid (step 16).
7. DOC-306: pasting serials replaces the stock with the available count (step 18); the formula quote equals the cart line only in the product currency (step 13).
8. DOC-308: the progress advances only while the page polls, so closing the page stops the job and the UI cannot resume it.
9. DOC-309: the export does not follow the list ordering — the dashboard sends the filters but not `ordering` (sort lives in the table state), so the file is always newest-updated first.

**Discrepancies found — code vs code (likely defects or gaps)**
10. Storefront bundle total: `bundle_block` (`storefront_product_service.py:131-149`) sums the raw component prices and formats them with the bundle's `Money` helper, so a component in another currency is read as if it were in the bundle currency and formula prices are ignored; each component's PDP price has the same problem. The dashboard total (`bundle_view`) converts correctly. Mixed-currency bundles show the buyer a different total.
11. Auction reopen: the form locks the end date while the status is `ended`, and saving «نشط» with the old past end is refused, so reopening needs two saves (via «مسودة»).
12. Personalization fields: no dashboard UI to edit a field's label, type, surcharge or options although the PATCH route accepts them.
13. Export button: rendered only for `catalog.manage`, while the route needs only `inventory.view`.
14. The import screen says «يجب أن يكون الملف بترميز UTF-8.» while Django also reads Windows-1256.
15. UI wording: the advanced-panels hint still says «تبويب «المنتج»» although the editor has had no tabs since 2026-10-22; the variant-matrix toast points to «قاموس المتغيرات» while the page is called «نماذج المتغيرات»; the price-cell lock says «مقصور على المالك ومدير المتجر.» though «مدير الفرع» also holds `catalog.manage`.

## 2026-10-27 — Official Step 28 · M-3 · 1.17 Integrator specs (webhooks) + 1.20 Domain 15 API (DOC-218 → DOC-221, DOC-263 → DOC-265)

**Verified first**: the Step 28 row of `execution-plan.md` reads Milestone M-3, subsection "1.17 Integrator specs (webhooks) + 1.20 Domain 15 API", DOC-218 → 221 and DOC-263 → 265, 7 tasks, outputs `docs/api/integrators/` and `docs/api/domains/15-reports/`. The roadmap subsections `### 1.17 Integrator specs — outgoing and inbound webhooks` and `### 1.20 Domain 15 API — Reports & analytics` list the same seven tasks.
**Ticked**: DOC-218 → 221 and DOC-263 → 265 (7 tasks). Roadmap status is now 288 / 536; next is official Step 29 (2.3 Catalog manuals, DOC-300 → 309).
**Discrepancies** (each is a `> ⚠️ Discrepancy` call-out in the page):
1. DOC-218: `X-Sharwa-Delivery` is the id of the attempt row and changes on every retry or redelivery; the stable dedupe key is the body `id` (`event_id`). Auto-disable counts failed attempts, not events (four failing events are enough), and test events and redeliveries count.
2. DOC-219: `order.status_changed` fires only for four source events; `order.created` is emitted only by the storefront and cart checkout; `order.fulfillment_changed` comes only from `set_fulfillment_status`; a fulfillment status that completes the order emits no delivered event; `product.updated` fires only on a full `save()` for 17 tracked fields. Several dashboard descriptions promise more.
3. DOC-220: no live delivery was possible, so the samples were run against a fixture generated with the real `sign()` and cross-checked with `openssl`, not against a real test-event delivery.
4. DOC-221: Sharwa AI has two receivers, not one; the Meta / TikTok / Telegram views never call `process_inbound_channel_message`; carrier failures reach `PendingWebhookEvent` only when the Celery task fails; the `topup_auto` rule lives only in `apply_credit_if_approved`.
5. DOC-263: the UI permission map differs from Django's `permission_code` for 20 of the 42 reports, and Django never checks `reports.view`.
6. DOC-265: an `orders` export ignores `location`; `export_ready` is created by pull-sync for both ready and failed jobs.
**Left open**:
1. Nothing was run against the Django or Next apps. This step changes documentation only, so no Django test, `npm run lint` or `tsc` was executed. The only code that ran is the Node and Python verification samples of `webhooks-verify-samples.md` (Node 18/18 cases, Python 19/19).
2. Source files not read: the writers of `WhatsAppSessionIndex` / `ChannelSessionIndex` rows, any `incoming_whatsapp_message` consumer, the body of `dispatch_instagram_comment_auto_reply`, the access gates of the supplier rotate route, tests for the Kuraimi, carrier, channel and supplier receivers, the BFF file `reports/exports/[job]/download/route.ts`, the report-model migration and six report builder bodies.
3. Cross-cutting observation, not corrected in the pages written so far: DRF runs `MerchantSessionAuthentication` (including the CSRF check) before the `HasTenantContext` permission, so a session POST without a CSRF token and without a store answers the CSRF `403` first. The gate tables of the Domain 11, 12 and 15 pages list the store check first; the difference only shows when both fail.
4. Observations recorded as open items, not roadmap differences: the SSRF check is a separate DNS lookup from the connection and lets hostnames in `100.64.0.0/10` through; Kuraimi and the carriers use only a static secret with no body HMAC; Meta has no `hub.challenge` GET handler; the TikTok and Meta `commerce_orders` payload formats are "assumed" in the code; order-level refunds, cancellations and coupon discounts are counted in full in every location of a split order; export creation does not validate dates; scheduled report e-mails set `last_sent_at` even when sending fails.

**Added**
- `docs/api/integrators/webhooks-outgoing.md` (DOC-218), `webhooks-events.md` (DOC-219), `webhooks-verify-samples.md` (DOC-220), `webhooks-inbound.md` (DOC-221).
- `docs/api/domains/15-reports/m25-reports.md` (new, 11 sections):
  - DOC-263 `#registry`, `#registry-table`, `#report-data`, `#refresh`
  - DOC-264 `#locations`, `#no-double-count`
  - DOC-265 `#exports`, `#export-create`, `#export-jobs`, `#export-download`, `#export-engine`, `#export-ready`, `#schedules`, `#schedule-endpoints`, `#schedule-run`, plus `#gate-matrix`, `#bff`, `#permission-map`, `#tests`, `#open-items`

**Changed**
- `docs/api/integrators/README.md` and `docs/api/domains/15-reports/README.md`: status tables (pages written).
- `specs/003-documentation/documentation-roadmap.md`: ticks and Status lines for the 7 tasks; status line updated (288 / 536, next Step 29).

## 2026-10-27 — Official Step 27 · M-3 · 1.16 Domain 12 API (DOC-203 → DOC-217)

**Verified first**: the Step 27 row of `execution-plan.md` reads Milestone M-3, subsection "1.16 Domain 12 API", DOC-203 → 217, 15 tasks, output folder `docs/api/domains/12-settings-staff-integrations/`. The roadmap subsection `### 1.16 Domain 12 API — Store settings, staff & permissions, domains & integrations` lists the same fifteen tasks (M34: DOC-203 → 206; M18: DOC-207 → 213; M19: DOC-214 → 217).
**Ticked**: DOC-203 → DOC-217 (15 tasks). Roadmap status is now 281 / 536; next is official Step 28 (1.17 Integrator specs + 1.20 Domain 15 API, DOC-218 → 221 and DOC-263 → 265).
**Discrepancies** (each is a `> ⚠️ Discrepancy` call-out in the page):
1. DOC-203: the roadmap says `display_*` is in YER_NEW; only `display_default_delivery_fee` is, and `display_free_shipping_threshold` uses the store's dashboard currency.
2. DOC-204: the roadmap gives 8 MB as the SEO image limit; the decoded image is limited to 5 MB and the whole request to 8 MB.
3. DOC-206: the roadmap lists gifting/loyalty (INT-019) among the `/config/` extensions; the serializer and view emit neither field (the same finding as in step 06).
4. DOC-207: terminating yourself answers `400`, not `403`, and `revoke-sessions` / `reset-password` have no self guard; the `temporary_password()` docstring says 10 characters with two digits, the code makes 9 characters plus a hyphen.
5. DOC-208: `effective-permissions/` equals `resolve_context()` only without `?location_id=`.
6. DOC-209: nothing writes `PersonalAccessToken.last_used_at` or `TrustedDevice.last_seen_at`, and no authentication class or middleware accepts a `shw_pat_` bearer (keys are created and revoked but not usable yet; consistent with DOC-024).
7. DOC-211: `refund` approvals have no creator; `refund` and `discount_exception` only change status; `escalated_at` is never set; the mock and Django differ on who may decide and on the audit code.
8. DOC-214 / DOC-217: the roadmap says all 13 M19 routes are owner-only; 12 are, `integrations/status/` is open to owner and staff.
**Left open**:
1. Nothing was run. This step changes documentation only, so no Django test, `npm run lint` or `tsc` was executed; test counts come from counting `def test_` (settings 11, staff 9, integrations 21, matching the roadmap where it gives a number).
2. The roadmap's "+ 101 legacy tests" for M18 (DOC-213) were not recounted.
3. Four nested M18 BFF files (`overrides/[oid]`, `sessions/[sid]`, `tokens/[tid]`, `devices/[did]`) were documented from the Django routes and `features/staff/api.ts`.
4. Signals on `StoreSetting` and the legacy HTML views were not traced.
5. Observations recorded as open items, not roadmap differences: `m08-theme-customizer.md` says the announcement text is trimmed, while M34 stores it as sent; `enforce_ip_whitelist` is stored but never enforced; `PATCH is_active=false` bumps `token_version` but leaves `StaffSession` rows un-revoked; `SHARWA_EDGE_IP` / `SHARWA_EDGE_CNAME` are not described in `deploy/README.md` or `.env.example`; a verified domain stays `verifying` until a certificate is issued by hand.

**Added**
- `docs/api/domains/12-settings-staff-integrations/m34-store-settings.md` (new, 11 sections):
  - DOC-203 `#read`
  - DOC-204 `#sections`, `#identity`, `#contact`, `#policies`, `#shipping`, `#currency`, `#seo`, `#announcement`, `#payments`
  - DOC-205 `#multi-location`
  - DOC-206 `#config`, plus `#access` (gate matrix), `#summary`, `#bff`, `#tests`, `#schema-changes`, `#open-items`, `#related`
- `docs/api/domains/12-settings-staff-integrations/m18-staff-permissions.md` (new, 13 sections):
  - DOC-207 `#staff`, `#temp-password`, `#terminate`, `#revoke`, `#counters`
  - DOC-208 `#assignments`, `#overrides`, `#effective`, `#resolver`, `#self-edit`
  - DOC-209 `#sessions`, `#tokens`, `#devices`, `#roster`
  - DOC-210 `#catalogue`, `#roles`
  - DOC-211 `#approvals`, `#approvals-list`, `#approvals-resolve`
  - DOC-212 `#audit`, `#audit-verify`, `#audit-codes`, `#alerts`
  - DOC-213 `#routes`, `#wiring`, `#migrations`, `#open-items`
- `docs/api/domains/12-settings-staff-integrations/m19-domains-integrations.md` (new, 11 sections):
  - DOC-214 `#domains`, `#domains-list`, `#domains-add`, `#domains-records`, `#domains-verify`, `#domains-state`, `#domains-primary`, `#domains-delete`
  - DOC-215 `#tracking`, `#tracking-settings`, `#tracking-config`, `#tracking-storefront`
  - DOC-216 `#webhooks`, `#webhooks-events`, `#webhooks-endpoints`, `#webhooks-detail`, `#webhooks-secret`, `#webhooks-test`, `#webhooks-deliveries`, `#webhooks-redeliver`, `#webhooks-engine`
  - DOC-217 `#status`, `#status-rows`, `#bff`, `#parity`, `#env`, `#tests`

**Changed**
- `docs/api/domains/12-settings-staff-integrations/README.md`: status table (all three pages written).
- `specs/003-documentation/documentation-roadmap.md`: ticks and Status lines for the 15 tasks; status line updated (281 / 536, next Step 28).

## 2026-10-27 — Official Step 26 · M-3 · 1.15 Domain 11 API (part B: courier app, Sharwa Ship) (DOC-195 → DOC-202)

**Verified first**: the Step 26 row of `execution-plan.md` reads Milestone M-3, subsection "1.15 Domain 11 API (part B: courier app, Sharwa Ship)", DOC-195 → 202, 8 tasks, outputs `m38-courier-app.md` and `m39-sharwa-ship.md`. The roadmap subsection `### 1.15 Domain 11 API — Shipping, couriers & Sharwa Ship` lists the same eight tasks (M38: DOC-195 → 197; M39: DOC-198 → 202).
**Ticked**: DOC-195 → DOC-202 (8 tasks). Roadmap status is now 266 / 536; next is official Step 27 (1.16 Domain 12 API, DOC-203 → 217).
**Discrepancies** (each is a `> ⚠️ Discrepancy` call-out in the page):
1. DOC-197 says `api/test_courier_api.py` has 6 tests; the file has 5 (the 6 belongs to `products/test_cod_collection.py`).
2. DOC-202 says `api/test_sharwa_ship_api.py` has 7 tests; the file has 6.
3. DOC-200 says `awb-queue/` lists failed items only; the code lists all four statuses (`pending`, `processing`, `issued`, `failed`), up to 200 rows. Only the retry is limited to `failed`.
4. The courier status view can return the rejection reason `geo_required`, a fifth value that the Zod contract (`REJECTION_REASONS`) does not list; the M38 and M39 read shapes show it as `null`.
**Left open**:
1. Nothing was run. This step changes documentation only, so no Django test, `npm run lint` or `tsc` was executed; the test counts above come from counting `def test_` in the files.
2. `issue_waybill` is patched in the only issue test, so the wallet debit, the split, the hazard and marketplace guards and the Celery dispatch have no test in `test_sharwa_ship_api.py`.
3. Observations recorded as open items (not roadmap differences): the issue route works on the order's first sub-shipment only; a split charges the zone price once per waybill; the weight preview ignores the zone's volumetric divisor; `assign` skips the marketplace/supplier fulfilment guard; the AWB retry re-runs the whole pending queue of the tenant; the custody rows written by `transfer_shift` are always tagged `SAR`.

**Added**
- `docs/api/domains/11-shipping/m38-courier-app.md` (new, 11 sections):
  - DOC-195 `#overview`, `#access`, `#summary`, `#me`
  - DOC-196 `#reads`, `#shipments`, `#shipment-detail`, `#custody`, `#bff-reads`
  - DOC-197 `#actions`, `#shift-start`, `#shift-end`, `#status` (Mermaid state diagram, rejection reasons), `#scan`, `#partial`, `#ownership`, `#fixes`, plus `#bff`, `#tests`, `#open-items`, `#related`
- `docs/api/domains/11-shipping/m39-sharwa-ship.md` (new, 10 sections):
  - DOC-198 `#pending`, `#issue` (Mermaid sequence diagram, `WaybillError` sentences, the split with a worked example, the wallet debit per waybill)
  - DOC-199 `#shipments`, `#shipments-list`, `#shipment-detail`, `#manual-status`, `#assign`
  - DOC-200 `#awb`, `#retry`, `#rate-cards`
  - DOC-201 `#supervisor`, `#reassign`, `#shifts`
  - DOC-202 `#access` (12-route gate matrix), `#messages`, `#bff`, `#mock-diffs`, `#tests`, plus `#open-items`, `#related`

**Changed**
- `docs/api/domains/11-shipping/README.md`: status table (m38 and m39 written).
- `specs/003-documentation/documentation-roadmap.md`: ticks and Status lines for the 8 tasks; status line updated (266 / 536, next Step 27).

## 2026-10-27 — Official Step 25 · M-3 · 1.15 Domain 11 API (part A: shipping settings/ops) (DOC-185 → DOC-194)

**Verified first**: the Step 25 row of `execution-plan.md` reads Milestone M-3, subsection "1.15 Domain 11 API (part A: shipping settings/ops)", DOC-185 → 194, 10 tasks, output `docs/api/domains/11-shipping/m15-shipping.md`. The roadmap subsection `### 1.15 Domain 11 API — Shipping, couriers & Sharwa Ship` lists the same ten tasks for M15; DOC-195 → 202 (M38, M39) belong to Step 26.
**Ticked**: DOC-185 → DOC-194 (10 tasks). Roadmap status is now 258 / 536; next is official Step 26 (1.15 part B, DOC-195 → 202).
**Left open**:
1. Nothing was run. This step changes documentation only, so no Django test, `npm run lint` or `tsc` was executed; the roadmap line "carrier/zone/orders/checkout/settings/tracking suites re-run green" (DOC-194) was not re-verified.
2. Three BFF files are nested too deeply to stage (`shipping/carriers/[code]/credentials/route.ts`, `shipping/carriers/[code]/test/route.ts`, `shipping/zone-review/[orderId]/resolve/route.ts`); their rows in `m15-shipping.md` §15.1 come from the Django views and the client hooks.
3. Pickup-code verification at the counter (A.13) and the `smsa` adapter are documented as open items; neither is built.
4. The Sharwa Ship operations routes (12 `views_sharwa_ship` patterns, lines 367–378 of `api/urls.py`) are out of scope here and belong to Step 26.

**Added**
- `docs/api/domains/11-shipping/m15-shipping.md` (new, 17 sections):
  - DOC-185 `#overview`, `#access`, `#summary`, `#conventions`, `#settings` (25-route table, gate chain, plan features, M34 settings row)
  - DOC-186 `#methods`, `#official-method`
  - DOC-187 `#pickups` (reorder, M22 hint, pickup code)
  - DOC-188 `#providers`, `#staff-link`
  - DOC-189 `#carriers`, `#carrier-state`, `#carrier-test`
  - DOC-190 `#zones-packaging` (grams ⇄ kg)
  - DOC-191 `#zone-review`, `#review-reason` (Mermaid decision diagram)
  - DOC-192 `#sla-edge`, `#sla-chain` (SLA chain, the four edge-case kinds, every note sentence)
  - DOC-193 `#shipment-actions`, `#convert`
  - DOC-194 `#schema-changes` (migration `0222`), `#bff`, `#bff-table`, `#tests`, plus `#open-items`, `#related`

**Changed**
- `docs/api/domains/11-shipping/README.md`: status table (m15 written; m38 and m39 planned for Step 26).
- `specs/003-documentation/documentation-roadmap.md`: ticks and Status lines for the 10 tasks; status line updated (258 / 536, next Step 26).
- `docs/CHANGELOG.md`: this entry.

**Checks run**
- Every «…» sentence and every quoted Arabic JSON string in the page was string-matched against all staged files of `sharwa_saas` and `sharwa-frontend/src`. The only misses are templated sentences built from values (`{N}`, `{names}`, `{status label}`, `#<id>`) and illustrative sample data.
- Worked examples that are marked as test-derived come from `api/test_shipping_api.py`; other sample values are labelled illustrative in the page.
- The Mermaid diagram of §11.2 was rendered with `mmdc`.
- Internal `#anchors` resolve; relative links resolve to files in the device listing, except `m38-courier-app.md` and `m39-sharwa-ship.md`, which are planned for Step 26.
- The test count was taken from source: `api/test_shipping_api.py` defines 9 tests, matching the roadmap.

**Discrepancies found — roadmap vs code**
1. DOC-188: `staff-options/` lists **all** staff members, including terminated ones; the roadmap says "eligible staff". Eligibility (not terminated, not already linked, not a carrier company) is enforced on write.
2. DOC-193: the conversion cancels `label_pending` **and** `pending_pickup` waybills (in `shipment_operations_service.convert_order_to_pickup`, not in `shipping_service`); the `cancelled` block sentence is shown only in the edge-cases feed and is not enforced by the route.
3. DOC-185: the owner-only check runs before the plan feature (the reverse of M22), and the settings message «أدخل مبلغاً صحيحاً (مثال: 1500.00)» has no closing full stop.
4. Observations (not roadmap claims): the detail URLs have no `GET <pk>/` (only `PATCH`, `DELETE`); a disabled official delivery method cannot be re-enabled through the API; the `_body` guard «جسم الطلب غير صالح.» is unreachable over HTTP; mock mode differs from Django in the max-weight fixture, the staff picker, the convert-to-pickup version key and messages, and plan-feature handling (`m15-shipping.md` §15.3).

## 2026-10-27 — Official Step 24 · M-3 · 1.14 Domain 10 API (part B: procurement) (DOC-178 → DOC-184)

**Verified first**: the Step 24 row of `execution-plan.md` reads Milestone M-3, subsection "1.14 Domain 10 API (part B: procurement)", DOC-178 → 184, 7 tasks, output `docs/api/domains/10-*/m23-procurement.md`. The roadmap subsection `### 1.14 Domain 10 API — Inventory, locations & procurement` shows that DOC-178 → 180 are **M22 Locations** tasks whose output is `m22-locations.md`; only DOC-181 → 184 go to `m23-procurement.md` (see discrepancy 1).
**Ticked**: DOC-178 → DOC-184 (7 tasks). Roadmap status is now 248 / 536; next is official Step 25 (DOC-185 → 194).
**Left open**:
1. Nothing was run. This step changes documentation only, so no Django test, `npm run lint` or `tsc` was executed.
2. `src/app/api/bff/locations/[id]/staff/[aid]/route.ts` is nested too deeply to stage; its row in `m22-locations.md` §9 and §7.6 is documented from the Django view and the client hook.
3. The roadmap line "staff/inventory/reports green" (DOC-184) was not verified.
4. The checkout call sites of `location_routing_service.route_order` were not traced; the page relies on the module docstring ("not activated automatically").

**Added**
- `docs/api/domains/10-inventory-locations-procurement/m23-procurement.md` (new):
  - DOC-181 `#suppliers` (object, list, create/patch messages, delete protection `409`)
  - DOC-182 `#po-list-create` (`PO-0001` number, filters, create, line validation, form options, line picker)
  - DOC-183 `#lifecycle` (detail, edit, `version`/`409` contract, Mermaid status machine, submit, resolve, M18 queue door, receive, cancel, timeline)
  - DOC-184 `#bff`, `#tests`, plus `#schema-changes` (migration `0230`)

**Changed**
- `docs/api/domains/10-inventory-locations-procurement/m22-locations.md`:
  - DOC-178 `#staff` (replace-on-reassign table, self-assignment refusal)
  - DOC-179 `#routing-rules` (renumbering, generated name, full-set reorder, preview and `_rule_matches`)
  - DOC-180 `#bff` (the 14 routes in one table) and `#tests` (7 tests mapped to sections)
  - header, §11 open items
- `docs/api/domains/10-inventory-locations-procurement/README.md`: status table (both pages written).
- `specs/003-documentation/documentation-roadmap.md`: ticks and Status lines for the 7 tasks; status line updated (248 / 536, next Step 25).
- `docs/CHANGELOG.md`: this entry.

**Checks run**
- Every «…» sentence in both pages was string-matched against all staged files of `sharwa_saas` and `sharwa-frontend/src`. The only misses are templated sentences built from values (`{limit}`, `#<id>`, `<n>`, `<product>`) and the generated rule name «عطور · جدة ← فرع جدة».
- The worked examples come from `test_locations_api.py` and `test_procurement_api.py`.
- The Mermaid diagram of `m23-procurement.md` §6.4 was rendered with `mmdc`.
- Every relative link resolves to a file in the device listing or to an output path planned in the roadmap; internal `#anchors` were checked.
- The tests were counted from source: `test_locations_api.py` 7, `test_procurement_api.py` 9, legacy 4 + 4 + 4 + 14.

**Discrepancies found — roadmap vs code**
1. Step 24 in `execution-plan.md` is named "part B: procurement" with output `m23-procurement.md` only; DOC-178 → 180 are M22 tasks written into `m22-locations.md`.
2. DOC-178: the self-assignment check in `LocationStaffView.post` compares ids as **strings** (`str(data.get('staff_id')) == str(me.pk)`) while `add_assignment` reads them with `int()`, so `5.0`, `"05"` or `" 5"` for staff `5` may pass it. Derived from code, **not** run or tested. Application code not changed.
3. DOC-180: `api/test_locations_api.py` has **7** tests, not 8.
4. DOC-179: the JSON rule has no `is_active` and no `name`, and no route can switch a rule off; the comment in the BFF `reorder/route.ts` says `{ok, reordered}` while Django, Zod and the mock also return `results`.
5. DOC-179: `preview/` is a rule-only simulation (ignores stock); the routing engine is documented as not activated automatically.
6. DOC-181: the supplier list also reads `page_size` (default 20, max 200), not only `?q&page`.
7. DOC-183: `submit/` takes `version` **optionally** (`required=False`); only `resolve/`, `receive/` and `cancel/` require it.
8. DOC-183: a second decision door exists — M18 `approvals/<pk>/resolve/` moves the same order with different gate, body and messages; it does not require `suppliers.approve`.
9. DOC-183: an owner's receive writes `StockMovement.actor` «النظام» while the timeline shows «مالك المتجر».
10. DOC-183: status labels differ between `PurchaseOrder.STATUS_CHOICES` and the UI `PO_STATUS_LABELS`.
11. DOC-184: there are **four** legacy supplier suites (26 tests), not three; the updated reject test `test_resolve_rejects_and_cancels_po` still has "cancels" in its name though it asserts `draft`.
12. DOC-178: the Next.js mock has no self-assignment check; DOC-179: the mock preview ignores rule `is_active`, does not trim the city and picks the fallback in array order.

## 2026-10-27 — Official Step 23 · M-3 · 1.14 Domain 10 API (part A: inventory, locations) (DOC-169 → DOC-177)

**Verified first**: the Step 23 row of `execution-plan.md` reads Milestone M-3, subsection "1.14 Domain 10 API (part A: inventory, locations)", DOC-169 → 177, 9 tasks, outputs `docs/api/domains/10-*/m21-inventory.md`, `m22-locations.md`. This matches the expectation. The roadmap subsection `### 1.14 Domain 10 API — Inventory, locations & procurement (المخزون والمواقع والمشتريات)` holds DOC-169 → 184; only 169 → 177 were worked.
**Ticked**: DOC-169 → DOC-177 (9 tasks). Roadmap status is now 241 / 536; next is official Step 24 (DOC-178 → 184).
**Left open**:
1. Nothing was run. This step changes documentation only, so no Django test, `npm run lint` or `tsc` was executed.
2. `m22-locations.md` §7 (staff), §8 (routing rules) and the full §9 (BFF and tests) are placeholders for DOC-178 → 180 in Step 24.
3. The three deepest location BFF files (`[id]/staff`, `[id]/staff/[aid]`, `routing-rules/*`) were listed but not read; they belong to Step 24.

**Added**
- `docs/api/domains/10-inventory-locations-procurement/m21-inventory.md`:
  - DOC-169 `#list`
  - DOC-170 `#counters-export`
  - DOC-171 `#adjustments`
  - DOC-172 `#ledger`
  - DOC-173 `#writeoffs` (Mermaid request → approve → deduct sequence)
  - DOC-174 `#bff`, `#data-model`, `#gates`, `#tests`
- `docs/api/domains/10-inventory-locations-procurement/m22-locations.md`:
  - DOC-175 `#list-create-mode`
  - DOC-176 `#detail-update` (field-mapping tables per section, `display_type` table, deactivation impact, `0226` fields)
  - DOC-177 `#location-inventory` (unit-key grammar, quarantine rule)

**Changed**
- `docs/api/domains/10-inventory-locations-procurement/README.md`: a status table for the three pages.
- `specs/003-documentation/documentation-roadmap.md`: ticks and Status lines for the 9 tasks; status line updated (241 / 536, next Step 24).
- `docs/CHANGELOG.md`: this entry.

**Checks run**
- Every «…» sentence in both pages was string-matched against `sharwa_saas` (`inventory_service.py`, `location_service.py`, `settings_service.py`, `staff_service.py`, `purchase_order_service.py`, `stock_movement.py`, `change_actor.py`, `views_inventory.py`, `views_locations.py`, `views_settings.py`, `views_products.py`, `products/models/locations.py`, migration `0144`) and the frontend mocks / `scripts/inventory-check.ts`. All are found. F-string templates are shown as templates.
- The worked examples come from `test_inventory_api.py` and `test_locations_api.py`.
- The URL count comes from `api/urls.py:436-460`: 9 inventory + 14 locations.
- Every relative link resolves to a file on disk or to an output path listed in the roadmap.

**Discrepancies found — roadmap vs code**
1. DOC-169: `?q` is normalized and matched **in Python** over all non-archived products. The PostgreSQL `translate` twin is not used by this route.
2. DOC-170: the mock export sets no `x-export-rows`, names the file `inventory.csv` (no date) and leaves the header line unquoted. Django quotes every field and dates the file name.
3. DOC-172: legacy note parsing also maps notes matching `(?:استرجاع|إرجاع) #(\d+)` to `type: "return"`.
4. DOC-173: the approver role falls back to the first active role when no «مدير المتجر» system role exists.
5. DOC-173: the M18 resolve route needs plan feature `staff_rbac` (off by default) and `staff.view`. A store without `staff_rbac` can request write-offs that nobody can decide through the API.
6. DOC-174: 8 BFF route files export 9 handlers (`writeoffs` has `GET` + `POST`). `.env.example:79` still lacks `inventory` and `locations` (known, DOC-461 / Step 52).
7. DOC-175: `locations/mode/` answers `409` only when turning the mode **off** with stock in **more than one** location. Turning it on never conflicts. The service flips the flag only and merges nothing.
8. DOC-177: the mock route doc comment names a bare `v<vid>` unit key. Django refuses it (`404` «الوحدة غير معروفة.»); the mock answers `404` «المنتج غير موجود.».

**Decisions pending**: none new.

## 2026-10-27 — Official Step 22 · M-3 · 1.12 Domain 8 API — Finance: payments, merchant wallet, expenses & Sharwa Pay (DOC-150 → DOC-163)

**Verified first**: the Step 22 row of `execution-plan.md` reads Milestone M-3, subsection 1.12 Domain 8 API, DOC-150 → 163, 14 tasks, output folder `docs/api/domains/08-finance/` — matching the expectation. The roadmap subsection `### 1.12 Domain 8 API — Finance: payments, merchant wallet, expenses & Sharwa Pay (المالية والمحفظة)` holds exactly those 14 tasks.
**Ticked**: DOC-150 → DOC-163 (14 tasks) — roadmap status 232 / 536; next is official Step 23 (1.14 Domain 10 API part A, DOC-169 → 177).
**Left open**: (1) Nothing was run: this step changes documentation only, so no application test, `npm run lint` or `tsc` was executed. (2) `src/app/api/bff/payments/gateways/[code]/credentials/route.ts` is nested too deep to stage, so that BFF row is documented from its sibling routes, `features/payments/api.ts` and `architecture/22-live-module-keys.md`; the Django side of every Domain 8 route was read in full. (3) The expenses sidebar / ⌘K entry and the mobile «مصروف جديد» bar were not re-read, so `m33-expenses.md` does not assert them. (4) Platform dues collection and the console's approve / reject screens belong to Domain 16 and are linked, not documented here.

**Added**
- `docs/api/domains/08-finance/README.md` — DOC-150 (replaces the stub): the three integrations with keys, providers and route counts (11 / 2 / 8), a Mermaid ledger diagram, ownership per ledger, shared patterns, cross-references
- `docs/api/domains/08-finance/m14-payments-wallet.md` — DOC-151 `#gateways`, DOC-152 `#store-payments`, DOC-153 `#payout-accounts`, DOC-154 `#wallet`, DOC-155 `#withdrawals`, DOC-156 `#dues` (with `#bff-rows`)
- `docs/api/domains/08-finance/m33-expenses.md` — DOC-157 `#list`, DOC-158 `#create`
- `docs/api/domains/08-finance/m40-sharwa-pay.md` — DOC-159 `#auth`, DOC-160 `#wallet-transactions`, DOC-161 `#requests`, DOC-162 `#topups`, DOC-163 `#withdrawals`

**Changed**
- `specs/003-documentation/documentation-roadmap.md`: ticks and Status lines for the 14 tasks, status line (232 / 536, next step 23).
- `docs/CHANGELOG.md`: this entry.

**Checks run**: every Arabic message in the four pages was compared with the Django and Next.js sources (`views_payments.py`, `payments_service.py`, `settings_service.py`, `expenses_api_service.py`, `views_expenses.py`, `customer_api.py`, `views_sharwa_pay.py`, `sharwapay/models.py`, `products/models/orders.py`, `products/admin.py`, `products/payments/*`, the BFF files and the Zod contracts); the numbers in the worked examples come from `test_payments_api.py`, `test_expenses_api.py` and `test_sharwa_pay_api.py`; route counts were recounted from `api/urls.py` (11 + 2 + 8); every relative link resolves to a page that exists on disk (`docs/api/overview/*.md`, `architecture/*.md`, `05-storefront`, `04-orders-returns`, `06-customers-wallets`, `07-marketing-design-partners`, `16-platform-console`, `ops/upload-limits.md`, the merchant and Sharwa Pay guide folders).

**Discrepancies found — roadmap vs code**
1. DOC-151: only the gateway **list** omits gateways outside the plan; `GET`, `PATCH` and `PUT` on such a gateway answer `403` «هذه الميزة غير متاحة في باقتك الحالية».
2. DOC-151: `base_url` is validated with `URLValidator(schemes=['http', 'https'])`, so `http://` is accepted while the error sentence says the link must begin with `https://`.
3. DOC-152 / DOC-156: `store/payments/` and `wallet/dues/` have no plan feature but are still **owner only** — a staff session gets «المدفوعات والمحفظة مقصورة على مالك المتجر.».
4. DOC-153: `PATCH payout-accounts/<pk>/` ignores `account_type` and `sort_order` in the body.
5. DOC-154: `commission` is declared as a ledger kind and reference kind (model, migration, Zod) but no code writes it — platform commission is collected from the merchant's Sharwa Pay wallet.
6. DOC-155: the request body field is `payout_account_id`; `payout_account` is the model FK and the key inside a response.
7. DOC-155: the Django admin actions call `decide_withdrawal(pk, decision)` without a reason, so a request rejected from the admin has `rejection_reason: null`; no HTTP route decides a merchant withdrawal.
8. DOC-156: `wallet/dues/?kind=` with any value other than `app_charge` silently means `commission`; `totals` and `counts` ignore the `status` filter.
9. DOC-159: the wrong-code counter lives in the session's OTP record and the 5-minute lock is per number in the cache, so requesting a new code restarts the counter; a failed WhatsApp delivery still consumes one of the 3 sends.
10. DOC-160: the sentence «متجر غير متاح» is not produced by the server — it sends `source_store_name: null` and `source_store_available: false`; the screen derives the label.
11. DOC-163: Sharwa Pay `withdrawals/` has no `Idempotency-Key` (the merchant withdrawal has one), and its insufficient-balance sentence carries no figure.

## 2026-10-27 — Official Step 21 · M-3 · 1.11 Domain 7 API — Marketing, storefront design & partners (DOC-137 → DOC-149)

**Verified first**: the Step 21 row of `execution-plan.md` reads Milestone M-3 Merchant core, subsection 1.11 Domain 7 API, DOC-137 → 149, 13 tasks, output folder `docs/api/domains/07-marketing-design-partners/` — matching the expectation.
**Ticked**: DOC-137 → DOC-149 (13 tasks) — roadmap status 218 / 536; next is official Step 22.
**Left open**: (1) Nothing was run: this step changes documentation only, so no application test, `npm run lint` or `tsc` was executed. (2) The three deepest marketing BFF files (`abandoned-carts/[id]/remind`, `campaigns/[id]/preview`, `campaigns/[id]/send`) are nested too deeply to be staged, so their rows are documented from the sibling routes, `src/features/marketing/api.ts` and `architecture/22-live-module-keys.md`; the Django side was read in full, and the other 15 marketing BFF files, the six design files and the three partner files were read. (3) The M34 settings page belongs to Domain 12 (`docs/api/domains/12-settings-staff-integrations/`), a later step, so the announcement-bar note names M34 without a link.

**Added**
- `docs/api/domains/07-marketing-design-partners/README.md` — DOC-137 (replaces the stub): the three integrations with live keys, providers and route counts, the shared-model table, the ownership and gate matrix, domain conventions
- `docs/api/domains/07-marketing-design-partners/m08-theme-customizer.md` — DOC-138 `#theme`, DOC-139 `#presets-announcement`, DOC-140 `#sections`
- `docs/api/domains/07-marketing-design-partners/m13-marketing.md` — DOC-141 `#gates-summary` (with `#bff-rows`), DOC-142 `#coupons`, DOC-143 `#offers`, DOC-144 `#abandoned-carts`, DOC-145 `#campaigns`, DOC-146 `#timeline-gifting-loyalty`
- `docs/api/domains/07-marketing-design-partners/m17-affiliates-influencers.md` — DOC-147 `#resources`, DOC-148 `#payouts`, DOC-149 `#referral`

**Changed**
- `specs/003-documentation/documentation-roadmap.md`: ticks and Status lines for the 13 tasks, status line (218 / 536, next step 22).
- `docs/CHANGELOG.md`: this entry.

**Checks run**: every Arabic message in the four pages was compared with the Django and Next.js sources (`design_service.py`, `settings_service.py`, `marketing_service.py`, `partners_service.py`, the three view modules, the BFF files and the Zod contracts); the numbers in the worked examples come from `test_partners_api.py`; route counts were recounted from `api/urls.py`; every relative link resolves to a page that exists on disk (`docs/api/overview/*.md`, `05-storefront`, `04-orders-returns`, `06-customers-wallets`, `ops/upload-limits.md`, the merchant guide folder).

**Discrepancies found — roadmap vs code**
1. DOC-137 / DOC-141: the roadmap counts "18 routes under `promotions/` + `loyalty/program/`"; code has 17 `promotions/…` routes + `loyalty/program/` = 18 in total (the BFF also has 18 rows).
2. DOC-141: `promotions/campaigns/channels/` is neither owner-only nor plan-gated (any signed-in session); `promotions/summary/` has the `discounts.apply` permission but no plan feature.
3. DOC-138 / DOC-139: `store/theme/presets/` needs only a session — no owner check and no `storefront_design` feature — while the theme and the sections are owner-only.
4. DOC-139: the announcement route shares M34's row and validation but is owner-only; M34's `PATCH settings/announcement/` also admits staff with `catalog.manage`.
5. DOC-140: `limit` 1–50 is validated for every section type (read from `content_data.limit` or `settings.limit`), not only `product_grid`.
6. DOC-144: Django's restore route is `cart/restore/<token>/` (trailing slash); the Next route has none. `channel_email` and `channel_sms` are in the settings response but not writable.
7. DOC-146: no gifting or loyalty field exists in `StoreConfigSerializer` or in the frontend `/config/` contract; both areas are served only by `promotions/gift-settings/` and `loyalty/program/`.
8. DOC-148: `mark-paid` stops (`break`) at the first selected sale that exceeds the allowance, so a later smaller sale is not paid in the same call.

**Discrepancies found — code vs code (likely defects or gaps)**
9. Image-size sentences differ: offers «حجم الصورة أكبر من 5MB.», sections «حجم الصورة 5MB على الأكثر.», theme logo «حجم الشعار 5MB على الأكثر.» (the six independent 5 MB constants already noted in `ops/upload-limits.md`).
10. `loyalty/program/` casts its three numbers to integers while the model columns are decimals (the same finding as the M35 read twin), so a fractional rate reads back truncated.
11. The theme PATCH bumps `version` and `updated_at` even when the body changes nothing, and omitting `version` skips the optimistic lock.
12. The `sharwa_aff` cookie is set without a `Secure` flag by the view; the sales list is capped at 500 rows without paging.

**Discrepancies found — code vs mock / UI**
13. A zero or negative commission: UI «العمولة أكبر من صفر.», Django «قيمة غير صحيحة.».
14. The BFF mock words some owner-only sentences differently from Django (for example the cart settings sentence).
15. A deleted-category message: Django «تصنيف محذوف — اختر آخر.» (with a full stop), the frontend `sectionErrors` text has none; the coupon `expired` boundary is `≤ now` on the server and `<` in the UI helper.

## 2026-10-27 — Official Step 20 · M-3 · 1.10 Domain 6 API — Customers, wallets & loyalty (DOC-124 → DOC-136)

**Verified first**: the Step 20 row of `execution-plan.md` reads Milestone M-3, subsection 1.10 Domain 6 API, DOC-124 → 136, 13 tasks, output folder `docs/api/domains/06-customers-wallets/` — matching the expectation.
**Ticked**: DOC-124 → DOC-136 (13 tasks) — roadmap status 205 / 536; next is official Step 21 (M-3 · 1.11 Domain 7 API, DOC-137 → 149).
**Left open**: (1) Nothing was run: this step changes documentation only, so no application test, `npm run lint` or `tsc` was executed. (2) Five BFF route files of the two modules (the deepest `customers/[phone]/…`, `customers/wallets/[id]/…` and `loyalty/points/[phone]/…` files) are nested too deeply to be staged, so their rows are documented from the sibling routes that were read, `src/features/{customers,wallets}/api.ts` and the register in `architecture/22-live-module-keys.md`; the Django side was read in full. (3) The overview pages the new pages link to (`docs/api/overview/*.md`) belong to other steps and do not exist yet, as in Step 19. (4) A payment failure after the order transaction has committed is not covered by any test, and the code read does not return redeemed points in that case (documented in `m35-wallets-loyalty.md#checkout-redemption`).

**Added**
- `docs/api/domains/06-customers-wallets/README.md` — DOC-124 (replaces the stub): the two integrations, the derived customer and its key, the SAR wallet, trust separation, route map, gates
- `docs/api/domains/06-customers-wallets/m07-customers.md` — DOC-125 `#list`, DOC-126 `#segments`, DOC-127 `#export` (with `#export-limits`), DOC-128 `#profile`, DOC-129 `#sub-resources` (with `#review-patch`), DOC-130 `#notes`, DOC-131 `#cod` (with `#cod-enforcement`)
- `docs/api/domains/06-customers-wallets/m35-wallets-loyalty.md` — DOC-132 `#wallets`, DOC-133 `#topup`, DOC-134 `#loyalty`, DOC-135 `#storefront`, DOC-136 `#checkout-redemption`

**Changed**
- `specs/003-documentation/documentation-roadmap.md`: ticks and Status lines for the 13 tasks, status line (205 / 536, next step 21).
- `docs/CHANGELOG.md`: this entry.

**Checks run**: every Arabic message in the three pages was compared with the Django and Next.js sources; the strings not found literally are f-string templates (`{refusals}`, `{min}`, `{store}`) or illustrative figures and were checked against their templates; every relative link to a page that exists on disk resolves, including the anchors in `m06-orders.md`, `m12-checkout.md` and `m42-wishlist-reviews.md`; links to pages that belong to later steps (`docs/api/overview/*.md`, Domain 7 and 8 folders) are planned in the roadmap; duplicate anchor ids were removed.

**Discrepancies found — roadmap vs code**
1. DOC-130: the roadmap gates note writes with `customers.edit_profile`; all three note routes use `customers.view`.
2. DOC-130: the delete route is `customers/<phone>/notes/<note_id>/`, not `customers/notes/<id>/`.
3. DOC-129: the review reply route is `PATCH /api/v1/reviews/<id>/`, not under `customers/`; and `approved` is the real moderation flag (the roadmap says always true).
4. DOC-126: the segment count equals the M13 campaign audience, but it can differ from `count` of `GET customers/?segment=…` (cancelled-only customers, the dormant basis).
5. DOC-131 / DOC-128: the automatic COD reason is «أُوقف تلقائياً بعد {refusals} مرات رفض استلام.», not the shortened text in the roadmap.
6. DOC-133: `Idempotency-Key` makes one movement per key, but the replay lookup is scoped to the wallet while the unique constraint is global — a key re-used on another wallet is answered `200` with the other wallet's transaction and nothing is written.

**Discrepancies found — code vs code (likely defects or gaps)**
7. The M07 wallet tab (last 10 rows, `actor` derived from the reason, `reference` always `order` «طلب #id») and the M35 ledger (stored `actor`, `refund` reference) describe the same rows differently.
8. `loyalty_view` casts `riyals_per_point` and `points_per_riyal_redemption` to integers while the model stores decimals, so a rate of 2.5 is displayed as 2 but applied as 2.5.
9. The merchant wallet create route accepts `^9(66|67)\d{8,9}$` (11 or 12 digits) and does not complete 9-digit Saudi numbers, while the customer book completes `5…` to `966…` and the storefront requires exactly 12 digits.
10. No route under `api/` writes `Wallet.is_active`; the top-up refuses a disabled wallet and checkout refuses a points redemption for one, but the API cannot disable or enable a wallet.
11. A wallet search by name only sees the stored `customer_name`; wallets created implicitly by a refund or a redemption show an order-derived name that the search cannot find.
12. Notes are not audited, and the loyalty-program read is reached through a different live key (`wallets`) than the editor (`marketing`).

**Discrepancies found — code vs mock**
13. `loyalty/redeem` answers the real points balance in Django and the requested points in the fixture; `loyalty/balance` adds `points_per_riyal` in Django.
14. Unknown customer on `customers/<phone>/cod/` and `POST notes/`: Django «لا عميل بهذا الرقم في متجرك.», fixture «العميل غير موجود.»; the fixture also derives `dormant` and the average basket differently and seeds platform trust only for two named customers.

## 2026-10-27 — Official Step 19 · M-3 · 1.8 Domain 4 API — Order management & returns (DOC-077 → DOC-088)

**Verified first**: the Step 19 row of `execution-plan.md` reads `| 19 | M-3 | 1.8 Domain 4 API | DOC-077 → 088 | 12 | docs/api/domains/04-orders-returns/ |` — Milestone M-3, subsection 1.8, 12 tasks, matching the expectation.
**Ticked**: DOC-077 → DOC-088 (12 tasks) — roadmap status 192 / 536; next is official Step 20 (M-3 · 1.10 Domain 6 API, DOC-124 → 136).
**Left open**: (1) Nothing was run: this step changes documentation only, so no application test, `npm run lint` or `tsc` was executed. (2) The BFF file `src/app/api/bff/orders/[id]/payment/[action]/route.ts` is nested too deeply to be staged here (the file tools failed on it), so the `payment` row of the `orders` key is documented from `ordersApi.payment`, `urls.py` and `architecture/22-live-module-keys.md`, which agree; re-check it when it is next opened. (3) `products/test_returns_b2b_api.py` was not available, so the roadmap's statement that the legacy tests were updated (cash = 400, a paid order for the wallet credit) is quoted, not re-verified; `api/tests.py` does carry the `refunds` feature patch. (4) Statements of the form "not emitted / not found" are scoped to the files read; `format_money` was not located, so no unasserted zero-amount display string appears in the examples.

**Added**
- `docs/api/domains/04-orders-returns/m06-orders.md` — DOC-077 `#overview` (with the 11-route table, §3), DOC-078 `#list`, DOC-079 `#detail` (with `#optimistic-lock` and `#timeline`), DOC-080 `#transitions`, DOC-081 `#payment`, DOC-082 `#refunds`, DOC-083 `#order-statuses`, DOC-084 `#related`
- `docs/api/domains/04-orders-returns/m24-returns.md` — DOC-085 `#overview` (with `#options`), DOC-086 `#returns`, DOC-087 `#rma`, DOC-088 `#refunds-log` and `#storage`

**Changed**
- `docs/api/domains/04-orders-returns/README.md`: the stub no longer says "planned".
- `specs/003-documentation/documentation-roadmap.md`: ticks and Status lines for the 12 tasks, status line (192 / 536, next step 20).
- `docs/CHANGELOG.md`: this entry.

**Checks run**: every Arabic message in both pages was compared with the Django and Next.js sources (all found; the others are f-string templates and were checked against their templates, including the refund-service caps, the `order_guard` texts, the timeline texts and the mock's «تغيّرت الحالة المالية إلى «{raw}».»); every relative link resolves against the files on disk and every internal anchor exists; money in examples is a test value (`200 ر.س`, `50 ر.س`, `1 ر.س`, `150.00`, `201.00`) or the same formatter applied to a round test number (`100 ر.س`), ids and timestamps are marked illustrative. Counts were verified: 11 URL patterns for M06 (`api/urls.py` 164–174) and 11 for M24; 11 `orders` and 4 `returns` BFF rows; 18 tests in `api/test_orders_api.py` (5 + 8 + 4 + 1) and 8 in `api/test_returns_api.py`. Sources read: `views_orders.py`, `serializers_orders.py`, `order_api_service.py`, `views_returns.py`, `returns_api_service.py`, `return_service.py`, `reverse_logistics_service.py`, `refund_service.py`, `merchant_credit_service.py`, `loyalty_service.py`, `order_events.py`, `order_push_service.py`, `webhook_service.py`, `order_approval_service.py`, `shipment_operations_service.py`, `products/models/{orders,returns,reverse_logistics}.py`, `api/urls.py`, both test modules, the `orders` and `returns` BFF routes, `src/features/orders/**`, `src/features/returns/**`, `src/mocks/orders/state.ts`, `src/mocks/returns/{state,passthrough}.ts`, `architecture/22-live-module-keys.md`.

**Discrepancies found — roadmap vs code**
1. DOC-080: the roadmap lists the `order.status_changed` / `order.fulfillment_changed` webhooks and the push as side effects of the status routes. In the files read, `POST orders/<id>/status/` notifies only for `→ completed` (`ORDER_DELIVERED`) and `→ cancelled` (`ORDER_CANCELLED`); `new → awaiting_payment`, `awaiting_payment → payment_review`, `payment_review → new` and `cancelled → new` write a timeline event and emit no webhook or push. A `marks_completed` fulfilment status flips `status` to `completed` and emits `order.fulfillment_changed` only (no `order.status_changed`, no `ORDER_DELIVERED` push).
2. DOC-081: "merchant credit on confirmation" is conditional — `process_order_merchant_credit` credits only `sharwa_pay` orders that are `paid`, or cash-on-delivery orders with an official Sharwa delivery method once `completed`; confirmed manual transfers and merchant gateways are never credited locally.
3. DOC-080: `POST status` to `completed` never calls the merchant credit; only `cancelled → new|completed` does, and only for paid `sharwa_pay` orders.
4. DOC-084: `create_order` does not call `_notify`, so manual phone orders and B2B drafts emit no `order.created` webhook, push or WhatsApp message.
5. DOC-086: the roadmap says the `refund_restock` movement is "referenced «إرجاع #id»"; the reference is `('return', <return id>)` (as the test asserts) and «إرجاع #{id}» is the movement's note.
6. DOC-088: the roadmap says every create/decision also lands on the order timeline; only the return-request actions do — RMA create, scan and QA write `rma.status` audit rows on the RMA only.
7. DOC-083 (seed): the Django seed leaves `marks_completed = false` on all five statuses, whereas the frontend's `DEFAULT_FULFILLMENT_STATUSES` sets it on «مكتمل».

**Discrepancies found — code vs code (likely defects or gaps)**
8. Paging envelopes differ: M06 `{count, next: "?page=N", previous, results}` (relative), `returns/` `{count, next: "/api/v1/returns/?…&page=N", previous, results}` (full DRF links, 404 «صفحة غير صالحة.» past the end), RMA `{count, counts, results}`, refund log `{count, results}`.
9. The 403 text for a missing permission differs: M06 «ليست لديك صلاحية لهذا الإجراء.» against M24 «ليست لديك صلاحية لتنفيذ هذا الإجراء.».
10. The frontend `CLOSED_STATUSES` is `['refunded']` only, while Django's (used for the counters strip) is `completed`, `cancelled`, `refunded`.
11. A `wallet` refund and a `wallet_credit` credit the entered number with no currency conversion; a `sharwa_pay` refund credits in the original transaction's currency.
12. `.env.example:79` omits the `returns` key (already reported in Step 07, DOC-461).
13. `ReturnRequest` statuses `approved` and `processing`, and RMA status `closed`, are never produced by the API.

**Discrepancies found — code vs mock**
14. `POST /api/bff/orders` is gated by `orders.view` in the mock; Django needs `orders.update_status` (+ `orders.create_b2b` for drafts).
15. Gift-message limit: mock 500, Django and the model 300.
16. A fulfilment status with `releases_stock`: the mock forces `status = cancelled` and restocks; Django restocks without touching `status`. Repeated status: mock «الطلب مكتمل بالفعل بهذه الحالة.», Django «الطلب بهذه الحالة بالفعل.».
17. Transition errors and timeline text: raw codes in the mock («تغيّرت الحالة المالية إلى «{raw}».»), emoji labels and «تغيّرت الحالة من «X» إلى «Y».» in Django.
18. Payment: the mock lets `approve` run from `awaiting_payment` and always sends `reject` to `pending_payment`; Django limits `approve` to `payment_review` and makes `reject` on a review order cancel and restock.
19. Refund: the mock does not require a paid order and caps at `paid − refunded`; Django requires `paid` and caps at `total − refunded`.
20. Pickup conversion: the mock zeroes `delivery_fee`; Django leaves it. `location` filter: the mock looks at lines only; `q` by id: substring in the mock, equality in Django.
21. Returns: the mock approve leaves status `approved` (Django `completed`); create requires a `completed` order (Django rejects only `refunded`); an unknown order is a `400` (Django `404`); the wallet refund needs an existing wallet (Django creates it); `restock` is `=== true` (Django defaults to true).
22. RMA: the mock creates `requested` with one event and requires a `completed` order (Django `in_transit_back`, events `requested → in_transit_back`); scan and QA `409` texts print the raw status code (Django prints the Arabic label).

## 2026-10-27 — Official Step 18 · M-3 Merchant core · 1.7 Domain 3 API (part B: advanced products, CSV) (DOC-069 → DOC-076)

**Verified first**: Step 17 (DOC-060 → DOC-068) is complete — all nine tasks are `[x]` with Status lines in the roadmap, and `m04-products.md`, `m05-organization.md` and `m37-advanced-products.md` (bundles, §4.1) exist under `docs/api/domains/03-catalog/`.
**Ticked**: DOC-069 → DOC-076 (8 tasks) — roadmap status 180 / 536; next is official Step 19 (M-3 · 1.8 Domain 4 API, DOC-077 → 088).
**Left open**: (1) DOC-076 is ticked, but the second half of its *Done when* — "open items are mirrored in the open-items register" — belongs to DOC-526 (Step 50): `docs/architecture/90-open-items.md` does not exist yet. The 17-row register-ready table (item, status, wording, where documented) is in `m37-advanced-products.md#notes`, to be copied there. (2) Nothing was run: the device shell was unavailable, so no test, `npm run lint` or `tsc` was executed (this step changes documentation only). (3) The BFF route files `products/[id]/extras/[...path]` and the two storefront auction routes are nested too deeply to be staged here; their mapping is taken from `live-products.ts`, `scripts/bundles-check.ts` and `.env.example` (stated in the page). DOC-284, DOC-520, DOC-522 and DOC-461 unchanged.

**Added**: no new file — the stubs of the page written in Step 17 are replaced:
- `docs/api/domains/03-catalog/m37-advanced-products.md#compatibility` (DOC-069), `#personalization` (DOC-070), `#auction` (DOC-071), `#serials` (DOC-072), `#import` (DOC-073), `#export` (DOC-074), `#storefront-auction` (DOC-075), `#notes` (DOC-076)

**Changed**
- `m37-advanced-products.md`: header (source, provider, contract, tests, last-verified, page status); §3 rows 5–18 link to their sections and show the storefront BFF paths; §5 (personalization, auction, serials, import and export) and §6 (BFF files, pointer to the register table); §7 related pages (storefront pages, buyer bidding guide).
- `specs/003-documentation/documentation-roadmap.md`: ticks, Status lines for the 8 tasks, status line (180 / 536, next step 19).

**Checks run**: every Arabic message in §4.2–§4.7 was compared with the Django and Next.js sources (all found; three come from f-strings and were checked against their templates: the 20,000-row limit, the column count, the 50 MB size); every internal anchor and relative link resolves (forward links to `m36-b2b-wholesale.md` and `m21-inventory.md` point at planned pages, as in Step 17); money and ids in examples are fixture or test values, tokens and timestamps are marked illustrative. Sources read: `views_product_extras.py`, `product_extras_service.py`, `product_import_service.py`, `storefront_auction_service.py`, `storefront_cart_service.py`, `storefront_product_service.py`, `product_service.py`, `stock_movement.py`, `cart.py`, `tier_pricing.py`, `checkout_service.py`, `feed_reader.py`, `api/urls.py`, models `catalog.py`, `stock.py`, `imports.py`, migration `0236`, `api/test_product_extras_api.py`; frontend `live-products.ts`, `schemas/extras.ts`, `schemas/product.ts`, `schemas/catalog.ts` (storefront), mocks `product-extras/state.ts`, `catalog/import.ts`, `catalog/products.ts`, `storefront/catalog.ts`, `scripts/bundles-check.ts`, `.env.example`, and the pages `m11-cart.md` and `auction-bidding.md`. **Nothing was run.** Model tests `products/test_product_auction.py` and `test_product_personalization.py` were not read.

**Discrepancies found — roadmap vs code**
1. DOC-071: the roadmap says the auction row is "locked on writes"; only the storefront bid takes the lock (`place_bid`). The merchant `PUT` reads the row without `select_for_update`.
2. DOC-071: the roadmap says the `PUT` follows "all mock rules"; Django adds one the mock lacks — amounts must be below 100,000,000.
3. DOC-076: the roadmap asks for the open items to be mirrored in the open-items register; the register page is DOC-526 (Step 50) and does not exist yet (see "Left open").

**Discrepancies found — code vs code (likely defects or gaps)**
4. `CompatibilityRule` model docstring says a conflicting bundle is rejected "programmatically in the validation engine"; no evaluation of the rules was found server-side in the files read — the rules are only passed to the browser.
5. `storefront_cart_service.py` docstring says personalization is "not priced here"; `Cart.__iter__` now adds the filled fields' surcharge per unit.
6. `storefront_auction_service.py` docstring says anti-sniping extends the end "by the same duration"; the code sets `end_at` to now + window.
7. Personalization values are never validated server-side (required flag, options, length, type), and a field's surcharge is charged even when the product's personalization flag is off.
8. `ProductImportJob.STATUS_CHOICES` has `failed`, and the front-end schema accepts `uploaded`; no code path produces either — a job always ends `done`.
9. Import row numbers drift after blank rows, finished jobs and their rows are never deleted, and a raw exception text can reach the merchant; the CSV export does not neutralise cells that start with `=`, `+`, `-` or `@`.
10. `place_bid` has no upper cap on the amount, and the phone check accepts Arabic-Indic digits; the bid form (step 16) accepts only Yemeni and Saudi mobile numbers while Django accepts any 9–15 digits.

**Discrepancies found — code vs mock**
11. Live bundle components carry `choice: null`; the mock fills `choice` from `COMPONENT_CHOICES`, so whether the live product page applies a compatibility rule is unconfirmed.
12. Serials: the mock has no 255-character limit and does not set the stock to the available count.
13. Import: the mock does not validate `old_price`, refuses `xlsx`, advances by elapsed time instead of 200-row batches, and has no row, size or Windows-1256 handling. Export: `\r\n` (Python `csv`) against `\n` (mock).
14. Storefront bid: the mock validates no name, phone or amount field and compares in the product currency with the store rates, not in the buyer's currency with the product's own rate.

## 2026-10-27 — Official Step 16 · M-2 Buyer journey · 2.5 Buyer help centre (part B) (DOC-327 → DOC-334)

**Ticked**: DOC-327 → DOC-334 (8 tasks) — roadmap status 172 / 536; next is official Step 18 (Step 17 was already complete).
**Left open**: (1) the 4 new screenshots are registered in `docs/guides/_assets/shots.json` but **not captured** — the device shell was unavailable; (2) seven roadmap screenshots have no manifest entry because mock mode cannot produce them with plain steps: the install bar (needs `beforeinstallprompt` or an iOS user agent), the sold-out «أعلمني عند التوفر» button, the slot picker and the auction block (fixture ids live in `src/mocks/product-extras`, not readable), and the wallet / redeem-points blocks (no known fixture phone with a balance or points). DOC-284, DOC-520, DOC-522 and DOC-461 unchanged.

**Added** (Arabic, RTL, from `docs/_templates/guide-page.md` and `docs/guides/_style-guide.md`)
- `docs/guides/buyer/05-storefront/app-and-notifications.md` (DOC-327)
- `docs/guides/buyer/05-storefront/wishlist.md` (DOC-328)
- `docs/guides/buyer/05-storefront/back-in-stock.md` (DOC-329)
- `docs/guides/buyer/05-storefront/reviews.md` (DOC-330)
- `docs/guides/buyer/05-storefront/book-appointment.md` (DOC-331)
- `docs/guides/buyer/05-storefront/auction-bidding.md` (DOC-332)
- `docs/guides/buyer/05-storefront/referral-links.md` (DOC-333)
- `docs/guides/buyer/05-storefront/wallet-and-points.md` (DOC-334)

**Changed**
- `docs/guides/_assets/shots.json`: 4 new `buyer/05-storefront/*` entries (app-and-notifications-1, wishlist-1 with a mobile capture, reviews-1, reviews-2).
- `docs/guides/_screenshots.md`: §7 rows and a hidden note on what is registered, not captured, and left open.
- `docs/guides/_glossary.md`: §9 «واجهة المتجر» gains المفضلة, تنبيه التوفّر, الاحتجاز, السعر الاحتياطي, رابط الإحالة.
- `docs/guides/buyer/05-storefront/README.md`: DOC-327 → 334 marked written; the whole folder is now written.
- `specs/003-documentation/documentation-roadmap.md`: ticks, Status lines for the 8 tasks, status line (172 / 536, next step 18).

**Checks run**: every «…» sentence in the eight pages was searched in the Next.js and Django sources (all found; one, «اختر موعداً (المدة … دقيقة)», is rendered from pieces that were each found); every relative link resolves; every image has a `shots.json` entry; no file, table or function name in the guide text (plan feature code `bookings` and URL paths only); Western digits; fixture data only. Sources read for this step: `features/pwa` (install prompt, push subscribe), the manifest, icon, service-worker and offline routes, `features/engagement`, the wishlist view, `pdp/components` (reviews, booking picker, auction panel, bid form), `booking_service`, `storefront_auction_service`, `product_extras_service`, `storefront_wallet_service`, `loyalty`, `affiliates`, `partners_service`, plus the Step 13 API pages `m44-pwa.md` and `m42-wishlist-reviews.md`. **Nothing was run.**

**Discrepancies found — roadmap vs code**
1. DOC-329: the code that sends the back-in-stock WhatsApp alert and sets `notified_at` was not found in the files read (signals, tasks, storefront and engagement views searched); the subscription and its re-arming are verified, the alert itself is not.
2. DOC-330: product reviews always wait for approval, but the UI says «شكراً، سيظهر تقييمك بعد المراجعة إن لزم.» (the server text has no «إن لزم»).
3. DOC-331: Django looks up to 21 days ahead for the next available date, but the picker shows 7 days and only offers «أقرب يوم متاح» inside them.
4. DOC-332: Django ends the auction when a **bid** reaches the buy-now price; the panel's «اشترِ الآن بـ» button instead opens an ordinary buy-now checkout, places no bid and leaves the auction open.
5. DOC-334: the roadmap says balance and points are checked with a WhatsApp code; the balance preview and the points balance are returned for any phone without a code — only spending and redeeming need one.

**Discrepancies found — code vs code (likely defects or gaps)**
6. The store-review form shows the same «… بعد المراجعة إن لزم.» text although store reviews are published at once, and turns the 3-per-hour `429` into «حاول بعد دقيقة.».
7. The bid form accepts only Yemeni/Saudi mobile numbers while Django accepts any 9–15 digits.
8. Two wordings for the same push state: the toast «سنُنبّهك عند تغيّر الحالة» and the panel «سنُنبّهك عند تغيّر حالة طلبك.».
9. The loyalty block stays hidden in live mode (`loyalty_enabled` not emitted by Django) — already reported in step 15, repeated as a known limitation in `wallet-and-points.md`.

## 2026-10-27 — Official Step 15 · M-2 Buyer journey · 2.5 Buyer help centre (part A) (DOC-318 → DOC-326)

**Ticked**: DOC-318 → DOC-326 (9 tasks) — roadmap status 164 / 536.
**Left open**: (1) the 8 screenshots of these pages are registered in `docs/guides/_assets/shots.json` but **not captured** — the device shell was unavailable, so the mock server and `scripts/guide-screenshots.ts` could not be run; (2) four roadmap screenshots have no manifest entry: the bundle and the bookable-service product pages (DOC-319, the mock fixture ids live in `src/mocks/product-extras`, which could not be read), the changed-items warning (DOC-324, no storefront recipe makes a product disappear between loading checkout and confirming) and the pickup tracking card (DOC-326, needs a merchant-prepared fulfilment). DOC-284, DOC-520, DOC-522 and DOC-461 unchanged.

**Added** (Arabic, RTL, from `docs/_templates/guide-page.md` and `docs/guides/_style-guide.md`)
- `docs/guides/buyer/05-storefront/browse-and-search.md` (DOC-318)
- `docs/guides/buyer/05-storefront/product-page.md` (DOC-319)
- `docs/guides/buyer/05-storefront/cart.md` (DOC-320)
- `docs/guides/buyer/05-storefront/cart-reminders.md` (DOC-321)
- `docs/guides/buyer/05-storefront/checkout-delivery.md` (DOC-322)
- `docs/guides/buyer/05-storefront/checkout-payment.md` (DOC-323)
- `docs/guides/buyer/05-storefront/place-order.md` (DOC-324)
- `docs/guides/buyer/05-storefront/order-success.md` (DOC-325)
- `docs/guides/buyer/05-storefront/track-order.md` (DOC-326)

**Changed**
- `docs/guides/_assets/shots.json`: 8 new `buyer/05-storefront/*` entries (3 with a mobile capture); `order-success-1` and `track-order-1` place a COD buy-now order with the mock OTP, each with its own fixture number.
- `docs/guides/_screenshots.md`: §7 lists the new images (with a hidden note that they are not captured yet and which ones are left open).
- `docs/guides/_glossary.md`: new §9 «واجهة المتجر» (السلة, اشترِ الآن, العربون, الوديعة, نقطة الاستلام, رمز الاستلام, رابط التتبّع). The glossary stays a draft awaiting fares's review (DOC-284).
- `docs/guides/buyer/05-storefront/README.md`: «الصفحات» table with a status column (DOC-318 → 326 written, DOC-327 → 334 planned).
- `specs/003-documentation/documentation-roadmap.md`: ticks, Status lines for the 9 tasks, status line (164 / 536, next step 16).

**Checks run**: every «…» sentence in the nine pages and the new glossary section was searched in the Next.js sources and the Django sources (all found, apart from three sentences rendered from several pieces — «رقم الطلب #…», «اختر موعداً (المدة … دقيقة)» and the file-size message built with `{MAX_SIZE_MB}` = 5 — whose pieces were each found); every relative link resolves to an existing file or a roadmap path (the buyer pages DOC-327 → 334 are linked by their roadmap paths); every image in the pages has a `shots.json` entry; no file, table or function name in the guide text (developer notes are in HTML comments); Western digits; fixture data only. Code read from copies of both local folders and from the Step 12–13 API pages. **Nothing was run**: no dev server, no screenshot capture, no test. Three files are eight folders deep and could not be read: `checkout/success/[public_uuid]/page.tsx`, `cart/restore/[token]/page.tsx` and the Sharwa Pay / late-receipt BFF routes; their content comes from the components that call them.

**Discrepancies found — roadmap vs code**
1. DOC-318: the roadmap lists sorting by name; the storefront sort menu offers only «الأحدث», «السعر: من الأقل», «السعر: من الأعلى» (Django accepts `ordering=name`).
2. DOC-321: the roadmap says the link "restores lines"; Django rebuilds them under `<product>_<size>_<colour>` with no variant id, replaces same-key lines and checks neither stock nor visibility.
3. DOC-325: the roadmap describes a late receipt on the success page; the form is shown only when no receipt is attached, and Django requires a receipt and an amount for a transfer at placement, so storefront buyers never see it and cannot replace a wrong receipt.
4. DOC-326: the roadmap says the courier is shown; the page has only a «اتصل بالمندوب» call button, the name Django sends is never displayed. Orders without a fulfilment row show «جاهز للاستلام» without a pickup code (the code needs a fulfilment row).

**Discrepancies found — code vs code (likely defects or gaps)**
5. Under Jeeb and Kuraimi the checkout says «ستنتقل إلى بوابة الدفع لإكمال العملية.», but Django charges directly with the buyer's code and never sends a redirect.
6. The loyalty block and the gift block of checkout depend on `config.loyalty_enabled` / `config.gifting_enabled`, which Django's storefront config does not emit; the storefront layout defaults both to false, so both are hidden in live mode although Django supports them (recorded as known limitations in the guides).
7. The coupon minimum-order message is built by Django with the store currency code, not the buyer's display currency.
8. The COD refusal reads «الدفع عند الاستلام غير متاح لهذا الرقم — اختر طريقة أخرى.» in the code dialog and «التوصيل بالدفع عند الاستلام غير متاح لهذا الرقم — اختر طريقة أخرى.» from the server; both are listed.

## 2026-10-27 — Official Step 14 · M-2 Buyer journey · 2.2 Getting started (DOC-290 → DOC-299)

**Ticked**: DOC-290 → DOC-299 (10 tasks) — roadmap status 155 / 536.
**Left open**: (1) the 16 screenshots of these pages are registered in `docs/guides/_assets/shots.json` but **not captured** — the device shell was unavailable, so the mock server and `scripts/guide-screenshots.ts` could not be run; (2) three roadmap screenshots cannot be produced in mock mode and have no manifest entry: the expired-OTP return to panel 01 (DOC-292, needs a 30-minute wait), the staff lockout message (DOC-295, the auth fixture has no lockout) and the full notifications page (DOC-298, the page does not exist); (3) DOC-290's plans and stats bullets describe sections the landing page does not render today (recorded as a known limitation). DOC-284, DOC-520, DOC-522 and DOC-461 unchanged.

**Added** (Arabic, RTL, from `docs/_templates/guide-page.md` and `docs/guides/_style-guide.md`)
- `docs/guides/merchant/01-public-onboarding/landing-and-plans.md` (DOC-290)
- `docs/guides/merchant/01-public-onboarding/register-store.md` (DOC-291)
- `docs/guides/merchant/01-public-onboarding/verify-otp.md` (DOC-292)
- `docs/guides/merchant/01-public-onboarding/provisioning-and-first-password.md` (DOC-293)
- `docs/guides/merchant/02-dashboard-shell/owner-login.md` (DOC-294)
- `docs/guides/merchant/02-dashboard-shell/staff-login.md` (DOC-295)
- `docs/guides/merchant/02-dashboard-shell/overview.md` (DOC-296)
- `docs/guides/merchant/02-dashboard-shell/command-palette.md` (DOC-297)
- `docs/guides/merchant/02-dashboard-shell/notifications.md` (DOC-298)
- `docs/guides/merchant/02-dashboard-shell/my-stores.md` (DOC-299)

**Changed**
- `docs/guides/_assets/shots.json`: 16 new entries (7 for domain 01, 9 for domain 02; 4 with a mobile capture).
- `docs/guides/_screenshots.md`: §7 lists the new images (with a hidden note that they are not captured yet).
- `docs/guides/_glossary.md`: «رابط المتجر», «رمز التحقق», «رقم واتساب المتجر» in §7 and a new §8 «هيكل اللوحة» (النظرة العامة, لوحة الأوامر, الإشعارات, مبدّل المتاجر, حساب التاجر). The glossary stays a draft awaiting fares's review (DOC-284).
- `docs/guides/merchant/01-public-onboarding/README.md`, `docs/guides/merchant/02-dashboard-shell/README.md`: status column.
- `specs/003-documentation/documentation-roadmap.md`: ticks, Status lines for the 10 tasks, status line (155 / 536, next step 15).

**Checks run**: every «…» sentence in the ten pages was searched in the Next.js sources and the Django sources (all found, apart from sentences rendered from several pieces — title lines, template strings with a substituted number, JSX with an inline number — whose pieces were each found; one word with shadda/fatha in a different order was re-copied from the code); every relative link resolves to an existing file or a roadmap path; no file, table or function name in the guide text (developer notes are in HTML comments); Western digits except where a UI sentence is quoted with Arabic-Indic digits; fixture data only. Code read from copies of both local folders. **Nothing was run**: no dev server, no screenshot capture, no test. The dashboard auth pages under `src/app/(dashboard)/_d/[store]/dashboard/(auth)/*/page.tsx` are eight folders deep and could not be read; their content comes from the form components they render.

**Discrepancies found — roadmap vs code**
1. DOC-290: the landing page mounts only the hero (`src/app/(marketing)/page.tsx`, owner direction 2026-10-17). The plans section, proof stats, FAQ and footer exist on disk but are not rendered; the hero link opens `/register` without a store name.
2. DOC-292: a WhatsApp failure is a `502` only on resend; the first send returns it as a `400` on the phone field, and verify never answers `502` from Django.
3. DOC-293: stalled stores are re-queued automatically by the sweeper; only failed stores need the console.
4. DOC-296: the low-stock count is not a sidebar counter; it is in «يحتاج تدخلك» and the bell.
5. DOC-297: users never see more than 5 results per group (the 10 is the server clamp for other callers).
6. DOC-298: there is no full notifications/history page; the delay before a new notification appears can reach about 50 s (20 s derivation throttle + 30 s bell poll), not 20 s.
7. DOC-299: the staff message on the screen has no full stop («هذه الصفحة لمالك المتجر فقط»); the page title is «كل متاجري»; the roster/range timezone is Django's active timezone (already reported in step 07).
8. DOC-295: the roster applies only when «الالتزام بجدول العمل» is on for the member.

**Discrepancies found — code vs code (likely defects or gaps)**
9. The failed provisioning panel promises «سنُعيد المحاولة تلقائياً وسنتواصل معك على واتساب», but a `failed` store is never retried automatically.
10. The expired setup-link messages send the owner to «فعّل المتجر برمز واتساب من لوحة التحكم»; that flow exists only in the legacy Django HTML screen, and the Next.js «نسيت كلمة المرور» answers `setup_required` for a store without a password — after one hour the new owner has no self-service path.
11. The roster tab says «الجدول فارغ — لن يستطيع الدخول في أي يوم.», but Django's `roster_allows()` allows any time when the member has no roster rows (saving an all-off week deletes every row).
12. Logout from the user menu and from ⌘K always returns to the owner login page, also for staff.
13. The overview fallback says «عقد لوحة النظرة العامة غير متاح بعد على الخادم.» although Django provides the route.
14. ⌘K shows «تبديل المتجر» to every owner, including single-store owners (who then get «لديك متجر واحد فقط.»).
15. Some UI hints use Arabic-Indic digits («من ٣ أحرف.») while the rest of the UI uses Western digits.

## 2026-10-27 — Official Step 13 · M-2 Buyer journey · 1.9 Domain 5 API part B: checkout mapping, tracking, PWA, engagement (DOC-107 → DOC-123)

**Ticked**: DOC-107 → DOC-123 (17 tasks) — roadmap status 145 / 536.
**Left open**: nothing in this step's range is unticked, but three bullets could not be verified (see Checks run): the Google Ads purchase conversion on `checkout/success/[public_uuid]` (DOC-111), the service-worker `push` handler (DOC-115), and the M07 «اعتماد» button `useApproveReview` plus the legacy HTML page's `is_approved` filter (DOC-123). DOC-284, DOC-520, DOC-522 and DOC-461 unchanged.

**Added**
- `docs/api/domains/05-storefront/m41-order-tracking.md` (DOC-112 → 114): endpoint and headers, content rules (two axes, cards, shipment, courier, privacy), status mapping and pickup-code lifecycle
- `docs/api/domains/05-storefront/m44-pwa.md` (DOC-115 → 117): install event and push subscription rows, order-status push, merchant push stats and broadcast
- `docs/api/domains/05-storefront/m42-wishlist-reviews.md` (DOC-118 → 123): shopper phone, wishlist, back in stock, store reviews, buyer code, product reviews and moderation

**Changed**
- `docs/api/domains/05-storefront/m12-checkout.md` (DOC-107 → 111): new §6 COD code, §7 Sharwa Pay code, §8 place order (with idempotency), §9 payment mapping, §10 success page and late receipt; the "Planned for step 13" section is removed, the endpoint table, header lines and the open items are updated
- `docs/api/domains/05-storefront/README.md`: module pages linked, `getTracking()` adapter row corrected (it exists at `src/features/tracking/api.ts`; step 12 had written that no definition was found), test counts filled in (tracking 11, PWA 11, engagement 4), pages table
- `specs/003-documentation/documentation-roadmap.md`: ticks, Status lines for the 17 tasks, status line (145 / 536, next step 14)

**Checks run**: every «…» sentence and every quoted Arabic string in the four pages was searched in the Django and Next.js sources (all matched except placeholders such as `<amount>`, `<n>`, `N`, f-string messages with a substituted limit, and fixture values); response key sets compared with `PUBLIC_KEYS`, the tracking `KEYS` and the assertions of `test_storefront_checkout_api.py`, `test_order_tracking_api.py`, `test_pwa_push_api.py` and `test_engagement_api.py`; internal links resolve or point to roadmap paths; examples use fixture values only. Code read from copies of both local folders (`C:\sharwa_front\sharwa-frontend`, `C:\sharwa_saas`). **Nothing was run**: no test suite and no request against the endpoints. The file bridge cannot stage files more than seven folders deep, so these were not read: BFF routes `checkout/sharwa-pay/otp/send`, `catalog/products/[id]/back-in-stock`, `catalog/products/[id]/reviews`, `orders/public/[uuid]/receipt`, the service-worker route and the success page; their behaviour is taken from the Django providers and the calling components. Migrations (`0218`, `0222`, `0228`, `0236`) and the legacy suites `products/test_push_notifications.py`, `products/test_pwa_install_tracking.py` were not read.

**Discrepancies found — roadmap vs code**
1. DOC-107: the BFF verify route comment says `cod_allowed` is always true; the roadmap and `verify_cod_otp` say it is `false` for a store-disabled phone. The page follows the code (the comment is stale).
2. DOC-109: the roadmap says `client_uuid` is stored inside the reservation transaction; the code writes `Order.idempotency_key` with an `UPDATE` in the same `transaction.atomic()` block immediately after `reserve_and_create_order`. The race behaviour the roadmap describes is real (through the `IntegrityError` branch).
3. DOC-111: the Google Ads purchase conversion on the success page is not verifiable (see above).
4. DOC-112: the roadmap says `X-Robots-Tag: noindex`; the code sends `noindex, nofollow`.
5. DOC-112: the roadmap lists the 404 as `{detail}` for an unknown UUID; a path segment that is not a UUID matches no route and gets Django's default 404 page.
6. DOC-114: the roadmap says the frontend `[NEEDS BACKEND]` notes and the BFF README were updated; the route comment and `api.ts` agree, the README was not read.
7. DOC-115: `install-events.ts` says «a 429 (30/min/IP)»; Django's limit is 300/min.
8. DOC-123: the roadmap says the M07 reviews tab has an «اعتماد» button (`useApproveReview`) and `PATCH reviews/<id>/` accepts `{approved}`; Django accepts it, but the BFF route comment documents only `{admin_reply}` and no `useApproveReview` was found in the staged frontend files. The roadmap also says the legacy HTML page hides unapproved reviews; only the two storefront queries were seen filtering `is_approved=True`.

**Discrepancies found — code vs code (likely defects or gaps)**
9. `OTPRequestTracker.is_blocked` is read by `send_cod_otp` but no code in the files read sets it; the 3-per-600-s counter is the effective limit.
10. The storefront does not send a device `client_uuid` to the COD code route, so the tracker key is derived from the session and a cleared cookie gives a fresh tracker row (the phone limit still applies).
11. `CheckoutResultSchema.next_action.type` allows `redirect_gateway` with a `url`; `placed_view` never returns it. The browser also sends an `Idempotency-Key` header that Django ignores (only the body `client_uuid` counts).
12. `customers/otp/send/` accepts the purposes `wishlist` and `back_in_stock`, but nothing in `engagement_service` verifies a code for them; only `review` is verified.
13. `check_buyer_otp` counts every verification call against a 3-per-600-s phone limit before comparing the code, so the per-code limit of 5 wrong guesses is hard to reach (by reading, not run).
14. `order_tracking_service._order` does not filter by `sales_channel`; any order can be shown by its UUID.
15. `PushSubscribeView` looks the order up by `public_uuid` without a channel filter; `push/unsubscribe/` has no rate limit.
16. The store-review limit (3 per hour) is kept in the session, so clearing cookies resets it.
17. No test calls `checkout/sharwa-pay/otp/send/`.

## 2026-10-27 — Official Step 12 · M-2 Buyer journey · 1.9 Domain 5 API part A: home, PDP, cart, checkout (DOC-089 → DOC-106)

**Ticked**: DOC-089 → DOC-106 (18 tasks) — roadmap status 128 / 536.
**Left open**: nothing in this step's range. DOC-107 → DOC-111 (checkout OTP, place order, payment mapping, public order) are Step 13 and are only announced in `m12-checkout.md`. DOC-284, DOC-520, DOC-522 and DOC-461 unchanged. The `/cart/restore/<token>` redirect page (DOC-102) is documented from the roadmap and from `CartPage`, because its file could not be read (see Checks run).

**Added**
- `docs/api/domains/05-storefront/README.md` (DOC-089): replaces the stub — domain table, Django-first fallback rule and adapters, visitor identity, Next-owned assets, money, cross-domain rows, test suites
- `docs/api/domains/05-storefront/m09-storefront-home-catalog.md` (DOC-090 → 094): `config/` as the home uses it, categories, products, facets, offers
- `docs/api/domains/05-storefront/m10-product-detail.md` (DOC-095 → 097): detail payload, reviews, formula quote
- `docs/api/domains/05-storefront/m11-cart.md` (DOC-098 → 102): cart, actions, coupon, contact, restore
- `docs/api/domains/05-storefront/m12-checkout.md` (DOC-103 → 106): pipeline with a sequence diagram, delivery options, payment options, quote

**Changed** (corrections to earlier pages, found while verifying this step)
- `docs/api/domains/01-public-onboarding/config.md`: `free_shipping_threshold` is an amount in the store currency (converted into the cart currency by `build_order_invoice`), not "new Yemeni rial"; the old text repeated a stale comment in `StoreConfigSerializer`.
- `specs/003-documentation/documentation-roadmap.md`: ticks, Status lines for the 18 tasks, status line (128 / 536, next step 13).

**Checks run**: every «…» sentence in the four pages was copied from the Django or Next.js code (cart, coupon, contact, restore, delivery, payment, quote and buy-now messages searched in `storefront_cart_service.py`, `storefront_checkout_service.py`, `products/models/marketing.py` and `products/services/messaging.py`); response key sets compared with the assertions of `test_storefront_catalog_api.py`, `test_storefront_product_api.py`, `test_storefront_cart_api.py` and `test_storefront_checkout_api.py`; internal links resolve or point to roadmap paths; examples use fixture values only (no real phone numbers, tokens or customers). Code read from copies of both local folders (`C:\sharwa_front\sharwa-frontend`, `C:\sharwa_saas`). **Nothing was run**: no test suite and no request against the endpoints, so the 500 suspected for a non-numeric `delivery_method_id` (item 11) is by code reading only. The file bridge could not stage `src/app/(storefront)/_s/[store]/cart/restore/[token]/page.tsx` (eight folders deep), so the redirect page itself was not read.

**Discrepancies found — roadmap vs code**
1. `/config/`: the Zod schema carries `gifting_enabled` and `loyalty_enabled`, but `StoreConfigView` / `StoreConfigSerializer.Meta.fields` (39 fields, plus `tracking` = 40) do not emit them, although the roadmap says INT-019 added them.
2. DOC-103 lists the pipeline as `quote_checkout → … → notify_order_created`; the code has the same relative order plus the idempotency lookup, the 60-second guard, `_changed_lines` (409), `_validate`, the geography guard, `_points_request`, `attach_cart_customer` before the loyalty ownership check, and `cart.clear()` plus the session clean-up before the notification. The page follows the code.
3. Free-shipping threshold unit: the roadmap ("compared in the dashboard currency") agrees with `build_order_invoice`; the comment of `get_free_shipping_threshold` and the earlier `config.md` said "new Yemeni rial". `config.md` is corrected; the comment is a code defect to fix by fares.
4. DOC-102: the redirect `/cart/restore/<token>` → `/cart?restore=<token>` is taken from the roadmap and from `CartPage`; the redirect page file was not read.

**Discrepancies found — code vs code (likely defects or gaps)**
5. `min_quantity` / `max_quantity` are truncated with `_int_or_none` in the PDP payload (0.5 becomes 0).
6. With `SHARWA_MOCKS=on`, a Django `404` for a page past the end of the product list is answered by the fixture.
7. The `currency` query parameter is not validated on the list, detail and cart reads; the cart read stores it in the session.
8. The formula quote converts after multiplying, the cart converts the unit price before multiplying, so the two can differ in converted currencies; the quote accepts decimals, the cart quantity is an integer.
9. The cart `display_discount` is the coupon only: the automatic-offer discount is subtracted from `display_total` but not exposed, and `applied_offers[].display_discount` is always `null` (also in the quote, where `display_promotion_discount` carries it).
10. The docstring of `storefront_cart_service.py` says personalization is not priced; `Cart.__iter__` has charged it since INT-045.
11. A non-numeric `delivery_method_id` in `checkout/quote/` is not guarded by `isdigit()` (unlike `pickup_location_id`) and probably raises `ValueError` ⇒ `500` (not run).
12. The Zod `PAYMENT_METHODS` list is closed (`manual`, `sharwa_pay`, `jeeb`, `kuraimi`, `cod`) while Django returns any enabled registry gateway code.
13. `cart/restore/` replaces a same-key session line instead of adding quantities, and checks neither visibility nor stock.

## 2026-10-27 — Official Step 10 · M-1 Foundations · 2.1 Manual framework (DOC-284 → DOC-289)

**Ticked**: DOC-285, DOC-286, DOC-287, DOC-288, DOC-289 (5 tasks) — roadmap status 110 / 536.
**Left open**: DOC-284 (Done-when needs fares's review of the style guide and glossary). DOC-520 and DOC-522 belong to Step 09 and stay open; DOC-461 (Step 07) unchanged.

**Added**
- `docs/guides/_style-guide.md` and `docs/guides/_glossary.md` (DOC-284, Arabic, drafts for review)
- `docs/guides/_screenshots.md` (DOC-285) + `docs/guides/_assets/shots.json` (the image manifest) + 9 images under `docs/guides/_assets/merchant/…`
- `scripts/guide-screenshots.ts` (DOC-285): docs tooling, not application code — one command regenerates every guide image from mocks
- `docs/guides/merchant/12-settings-staff-integrations/permissions-matrix.md` (DOC-286)
- `docs/guides/merchant/02-dashboard-shell/plan-features.md` (DOC-287) · `troubleshooting-access.md` (DOC-288)
- `docs/guides/merchant/08-finance/money-display.md` (DOC-289)

**Changed** (corrections to earlier pages, found while verifying this step)
- `docs/api/overview/plan-features.md`: delivery methods are gated by `shipping_companies`, not `shipping_settings`; the external carriers routes carry no feature (the page said `shipping_companies`); Arabic names of `staff_rbac`, `social_channels`, `marketplaces`, `dropshipping` now as seeded; `billing/0001` and `0012` seed no feature, so 40 codes is final.
- `docs/api/overview/permissions.md`: the "to confirm" note on manager roles is now confirmed against all 239 products migrations (29 of 36 keys; the seven report/supplier keys belong to no seeded role).
- `docs/guides/README.md`, `docs/guides/_assets/README.md` and the README of `merchant/02-dashboard-shell/`, `merchant/08-finance/`, `merchant/12-settings-staff-integrations/`: status column.
- `specs/003-documentation/documentation-roadmap.md`: ticks, Status lines for the six tasks, status line.

**Checks run**: every «…» sentence in the six pages searched in both code bases (the only misses are writing examples in the style guide and money values written in `format_money` form); internal links resolve or point to roadmap paths; no secrets, tokens or real data (fixture phone numbers are masked in every image). Code read from read-only clones of both GitHub repositories as pushed on 2026-10-26 (`sharwa-frontend` `bd9a690`, `sharwa-store` `e3df05a`). The screenshot script was **run**: Next.js dev server in mock mode in the cloud workspace, 9 images captured, `npx eslint scripts/guide-screenshots.ts` and `npx tsc --noEmit` both clean. Nothing ran on the Windows machine.

**Discrepancies found — roadmap vs code**
1. The landing page has no plans section (hero only, owner direction 2026-10-17, `src/app/(marketing)/page.tsx`); DOC-287's "plans section" screenshot cannot exist.
2. DOC-288 asks for a "conflict toast"; orders show an inline panel, never a toast (`conflict-panel.tsx`). The panel was captured.
3. DOC-285 says reuse the `*-check.ts` scripts; they assert, mutate mock state and write to `docs/visual-checks/` (design evidence guides must not link), so the pipeline is a separate manifest-driven script that reuses their conventions and one of their flows.
4. Plan auto-assign («إسناد تلقائي عند تفعيل الباقات») happens only through the console route (`console_billing_service.patch_billing_settings`); turning plans on from the legacy Django admin assigns nothing (its help text says "not retroactive").
5. «مدير المتجر» / «مدير الفرع» hold 29 of 36 keys, not "the whole catalogue" (confirmed — see Changed).
6. Free-shipping: the threshold is converted into the cart currency (`pricing.build_order_invoice`), not the subtotal into the dashboard currency. Same result; the guide states the code's order.
7. The UI does not use «عضو فريق» (it says «موظف») nor «صندوق الوارد» (it says «المحادثات» / «صندوق المحادثات»); couriers have «المناوبة», POS has «الوردية». The guide glossary follows the UI.

**Discrepancies found — code vs code (likely defects or gaps)**
8. The mock formatter `displayMoney()` (`src/mocks/_fixtures.ts:98`) claims to mirror Django `format_money()` but always prints two decimals and a trailing `$` («100.00 ر.س», «26.67 $»); Django prints «100 ر.س», «$26.67» and rounds Yemeni rial. Every screenshot with money shows the mock form.
9. Mock roles show «مدير المتجر» with 36 of 36 keys and paraphrased key names («حذف الطلبات» vs Django «حذف طلب»); screenshots of roles differ from a real store.
10. Sidebar group «التسويق» is gated on the legacy code `marketing`, which no `/api/v1` route checks: turning it off hides coupons, affiliates and influencers from the menu while they still work. Same menu-only effect for `promotions`, `bulk_upload`, `product_report`, `customer_report`.
11. Dues, expenses and support tickets have no plan feature in Django, but the sidebar puts them in the «محفظة المتجر» group gated on `merchantwallet`, and the dues screen itself is gated on it.
12. The external carriers routes have no feature gate in Django; the frontend hides «شركات الشحن الخارجية» behind `shipping_companies`.
13. «جميع المنتجات» has no permission gate in the sidebar, but Django's product list needs `inventory.view`.
14. «سجل التدقيق»: Django accepts `staff.view_sessions` or `reports.sales.view`; the sidebar shows it for `staff.view_sessions` only.

**Decisions pending (fares)**
- Review and approve `_style-guide.md` and `_glossary.md` (closes DOC-284).
- Accept `scripts/guide-screenshots.ts` as docs tooling (it is outside `docs/`), and run it once on Windows: `set SHARWA_LIVE_MODULES=none&& npm run dev`, Django stopped, then `npx tsx scripts/guide-screenshots.ts`.
- Make the mock `displayMoney()` match `format_money` so screenshots show real money formatting (item 8) — a frontend change, Step 52 candidate.
- Grant the seven report/supplier keys to the manager roles by migration, or keep "custom role only" (item 5).
- Mount the pricing section on the landing page again, or drop the plans screenshot from DOC-287 (item 1).
- Menu gates in items 10–14: align the sidebar with Django, or keep as is.

## 2026-10-27 — Official Step 09 · M-1 · 3.9 Environment & commands + 3.11 Testing & QA (DOC-511 → 514, DOC-520 → 522)

**Ticked**: DOC-511, DOC-512, DOC-513, DOC-514 and DOC-521 (5 tasks) — roadmap status 105 / 536.
**Left open**: DOC-520 (needs a real test-discovery count), DOC-522 (needs a decision from fares), and DOC-461 from Step 07 (waits for the `.env.example` fix in Step 52).

**Added** (all under `docs/ops/`)
- `dependencies.md` (DOC-512) · `management-commands.md` (DOC-513) · `upload-limits.md` (DOC-514)
- `testing/django-suites.md` (DOC-520, register: 160 files, 1,814 test methods counted statically) · `testing/frontend-qa.md` (DOC-521) · `testing/ci.md` (DOC-522, a proposal)

**Changed**
- `docs/ops/environment.md`: DOC-511 sections 2–7 added after the Step 07 section 1 (kept as it was, anchors `#live-modules` and `#later-sections` unchanged).
- `docs/ops/README.md` and `docs/ops/testing/README.md`: the "planned pages" tables now carry a status column.
- `specs/003-documentation/documentation-roadmap.md`: ticks, Status lines for the seven tasks, status line.

**Checks run**: Arabic strings copied from the code; internal links resolve or point to a page listed in the roadmap; no secrets, tokens or real data (variables are named, never valued; no `.env` file was read). **Nothing was executed**: test counts are static (read from the source with a script, Django has no `test --list`) and the browser QA scripts were read, not run.

**Discrepancies found — roadmap vs code**
1. `NEXT_PUBLIC_USE_MOCKS` does not exist; the switches are `SHARWA_MOCKS` and `SHARWA_LIVE_MODULES` (integration-protocol text still names the old variable).
2. Nginx: the roadmap says `client_max_body_size 8M` must match Django; the code sets `55m` (`deploy/nginx/snippets/sharwa-proxy.conf`). Three code comments still say 8M.
3. `expenses-check.ts` has no per-run `RUN` tag (it is in `marketing-check.ts`).
4. Test counts differ from the roadmap for INT-025, 027, 046 and 047, and the staff figure «101» could not be reproduced.
5. `none` in `SHARWA_LIVE_MODULES` is not a mode, just an unknown word that matches no module; an empty value has the same effect.
6. The roadmap lists two mandatory frontend gates; the README adds `rm -rf .next/types` before `tsc` and three more audits. The page lists all five.

**Discrepancies found — likely defects (code reading, not reproduced)**
7. `123456` is accepted not only as the POS refund OTP but also as the store sign-up OTP while `DEBUG` is on.
8. Checkout receipt upload trusts the declared content type; there is no Pillow check.
9. `MAX_ROWS = 200_000` in `feed_reader.py` is not used.
10. `send_abandoned_cart_reminders` and `release_stuck_orders` have no Beat or cron entry in the repository.
11. `AramexAdapter` reads `ARAMEX_API_URL` from Django settings, but `config/settings.py` never defines it, so the Aramex connection test always answers «not configured» (`products/carriers/aramex.py:28`; call-out on `environment.md`).
12. `tenant-shell-check.ts` defaults to port 3100, the other scripts to 3000.
13. `next.config.ts` sets `ignoreBuildErrors: true`, so `npm run build` does not fail on type errors; `tsc --noEmit` is the only type gate.
14. The backend `ci.yml` test job is red by design: 15 legacy failures are known and the gate is strict.
15. `.env.example` lists 35 of the 39 module keys (inventory, locations, returns and wallets are missing).
16. The legacy HTML import view and the platform Sharwa Pay top-up view have no reviewed upload limit.

**Decisions pending (fares)**
- CI: option A, B or C in section 8 of `testing/ci.md` (DOC-522 stays open until then).
- The proxy in front of Next.js and its body limit (the BFF buffers the whole body, no limit in code).
- Schedule `send_abandoned_cart_reminders` and `release_stuck_orders`, or retire them.
- Confirm the owner of Green API, DeepSeek and the Meta / TikTok / Amazon platform apps (marked «confirm» on `dependencies.md`).
- Run the real test-count command on `django-suites.md` so DOC-520 can be ticked.
- Fix the 15 known backend failures, correct the three stale 8M comments, and fix `.env.example` (Step 52).

## 2026-10-27 — Official Step 08 · M-1 Foundations · 3.4 Security + 3.5 Data & money integrity (DOC-465 → DOC-480)

**Ticked**: DOC-465 → DOC-480 (16 tasks) — roadmap status 100 / 536.

**Added** (all under `docs/architecture/`)
- `30-security.md` (DOC-465 `#identities`, DOC-466 `#csrf`) · `31-authorization.md` (DOC-467) · `32-secrets.md` (DOC-468) · `33-otp.md` (DOC-469) · `34-rate-limits.md` (DOC-470) · `35-outbound-and-redirect-safety.md` (DOC-471) · `36-ownership-checks.md` (DOC-472) · `37-audit.md` (DOC-473)
- `40-money.md` (DOC-474) · `41-idempotency.md` (DOC-475) · `42-concurrency.md` (DOC-476) · `43-ledgers.md` (DOC-477) · `44-stock-ledger.md` (DOC-478) · `45-approvals.md` (DOC-479) · `46-timelines-and-notifications.md` (DOC-480)

**Changed** (corrections to earlier pages, found while verifying this step)
- `docs/api/domains/02-dashboard-shell/m49-notifications.md`: the `approval_pending` call-out no longer says an empty `approver_role` reaches all staff (`approver_role` is required, `staff_approvals.py:54`); it now names the real gaps (location ignored, `staff.manage` deciders not notified).
- `docs/api/overview/money.md`: migration `products/0217_storesetting_fx_rate_precision` exists (the page said it was missing).
- `docs/api/overview/permissions.md`: `GET permissions/` answers Arabic categories for every key (`CATEGORY_LABELS`), not English ids for the early seeds.
- `specs/003-documentation/documentation-roadmap.md`: ticks, status notes, status line.

**Checks run**: Arabic messages copied from the code; every internal link resolves or points to a planned page; no secrets, tokens or real data (settings are named, never valued); nothing was run (the shell on the user's computer was unavailable).

**Discrepancies found — likely defects (code reading, not reproduced)**
1. B2B drafts: `orders/b2b-draft/`, `b2b-drafts/` and `…/resolve/` use `check_merchant`, which needs the owner flag that the JSON staff login clears (`views_auth.py:330`, `views.py:369-376`); create also refuses the owner — nobody using the JSON login can create a draft through that route. `test_b2b_api.py:58,190` set the flag and mask it.
2. Two approval routes skip the approver-role check: M23 PO resolve (`views_procurement.py:110`) and M36 B2B resolve (`api/views.py:544-578`).
3. The legacy HTML approvals queue applies the effect only for `po_approval` (`staff_approvals.py:58-66`); approving a write-off, B2B draft or shift shortage there changes nothing.
4. `resolve_context` ignores `Role.is_active` — a deactivated role still grants its keys; `effective_permissions` and `resolve_context` differ in three ways (roadmap said "verified equal").
5. Rotating `SECRET_KEY` alone makes every encrypted credential unreadable (the column HMAC uses it; `settings.py:41-43` says the keys are independent).
6. Wallet top-up and inbox reply keys are unique globally but pre-checked per wallet / per conversation: a reused key elsewhere answers 200 with another record and does nothing (`wallet_service.py:211,243-247`; `inbox_api_service.py:325-368`).
7. `save_keyword` does not catch `IntegrityError` → a race answers 500 (`channels_api_service.py:252-277`).
8. Webhook host guard: only IP literals use `is_global`; a host name resolving into `100.64.0.0/10` passes at save and send (`webhook_service.py:67-76`).
9. Legacy `merchant/master-dashboard/` still picks the multi-store account by phone only (`tenants/views.py:329-332`) — the API was fixed, the HTML page was not.
10. Support tool-call logs are stored raw and redacted only at read time (`support_api_service.py:214-230`); a non-JSON `result_summary` is served unredacted.
11. `AuditLog` hash chain: `_last_row_hash()` takes no lock, so concurrent inserts can fork the chain; `0149` REVOKE applies to `PUBLIC` only.
12. Refund and cancel swallow `InsufficientMerchantWalletBalanceError` (`refund_service.py:187`, `orders.py:547`); the Django-admin Sharwa Pay `reject_withdrawal` has no lock or transaction (`sharwapay/admin.py:117-127`).
13. Stock: cancel / release / re-activate change stock without a `StockMovement`; the mirror ignores quarantine (`locations.py:450,468`); no Beat entry releases expired reservations.
14. POS refunds may appear twice on the order timeline (`pos_service.py:1306-1310`); B2B approve/reject never writes an `order.approval` event.

**Discrepancies found — roadmap or API pages vs code**
15. Buyer OTP purposes `auction`, `wishlist`, `back_in_stock` are issued but never checked; only `review` is consumed (`engagement_service.py:255`).
16. Wallet / Sharwa Pay code limits inside `checkout/` answer 400 with a field key, not 429 (`storefront_checkout_service.py:719-727`); `Retry-After` is not uniform.
17. Gate order is not uniform (seven variants across views); the roadmap lists 29 permission keys, the code seeds 36 (`orders.delete`, `customers.manage_tier` checked by no route).
18. Marketplaces and dropshipping format money with their own `_money` (`12.50 $`, code `YER`), not `format_money`; the «daily» USD rate is a stored value nothing refreshes.
19. `.collect()` is not the only debit — the single debit function is `collect_platform_fee_from_merchant` (`tenants/merchant_billing.py:29`), also used by `issue_waybill`.
20. `approval_pending` audience: the owner sees all, location is ignored, `staff.manage` deciders are never notified (`notification_service.py:121-133, 289-302`).

**Decisions pending (fares)** — all candidates for the Step 52 fix list unless noted
- Items 1–14 above: which to fix, and in which order (1, 2, 3, 6 and 12 affect money or authorisation).
- Encrypt the Meta/TikTok CAPI tokens (stored plain)? Add Django `no-store` to the four one-time-secret responses (webhook create/rotate, PAT create, staff create, reset-password)?
- Move storefront OTPs from plain session storage to HMAC; drop or wire the unused buyer OTP purposes?
- Should POS, merchant/B2B orders and chat-to-order honour `custom_sar_rate` and formula pricing like the storefront? Write or drop `exchange_rate_locked`?
- Should roster limits also end open staff sessions? Enforce trusted devices at POS, or keep them as a register?

## 2026-10-27 — Official Step 07 · M-1 Foundations · 3.3 BFF & live/mock switch architecture (DOC-455 → DOC-464)

**Ticked**: DOC-455 → DOC-460, DOC-462 → DOC-464 (9 tasks) — roadmap status 84 / 536. **Left open**: DOC-461 — its documentation is written, but its Done-when needs `.env.example` fixed, and the execution plan allows code/config edits only in Step 52.

**Added**
- `docs/architecture/20-bff.md` (DOC-455 `#liveormock`, DOC-456 `#products-rules`, DOC-457 `#adapters`, DOC-462 `#deprecated`, DOC-464 `#body-buffering`).
- `docs/architecture/21-mock-runtime.md` (DOC-458).
- `docs/architecture/22-live-module-keys.md` (DOC-459): the 39-key register with a parity table against `.env.example`.
- `docs/architecture/23-ready-api-v1-audit.md` (DOC-463): 30 Ready rows re-verified; paste-ready replacement table for `ready-api-v1.md`.
- `docs/ops/runbooks/switch-module-live.md` (DOC-460).
- `docs/ops/environment.md` — only `#live-modules` (DOC-461); the rest of the page is DOC-511 → 514 (official Step 09).

**Changed**
- `specs/003-documentation/documentation-roadmap.md`: ticks, status notes (including the DOC-461 open reason), status line.

**Not changed on purpose**: `sharwa-frontend/.env.example`, `specs/001-sharwa-frontend-platform/contracts/ready-api-v1.md` and the `account/stores` route files — code/config/spec edits outside `docs/` are reserved for Step 52 by the execution plan. The pages describe the exact change for each.

**Checks run**: Arabic messages copied from the code; the 39-key set extracted from the code; the `environment.md` parity script run against a staged copy (`code: 39 keys · .env.example: 35 keys`, exit 1); internal links resolve or point to planned pages; no secrets or real data; nothing else was run.

**Discrepancies found**
1. DOC-455: Django's `Cache-Control` is never forwarded — the BFF always sets `no-store` (`upstream.ts`, not in `FORWARD_RESPONSE_HEADERS`).
2. DOC-455: the BFF has no 8 MB cap of its own; `DATA_UPLOAD_MAX_MEMORY_SIZE` (8 MB, `settings.py:368`) limits non-file data only.
3. DOC-464: the repo's Nginx is `client_max_body_size 55m` (`deploy/nginx/snippets/sharwa-proxy.conf:12`, sized for 50 MB feeds), not `8M`.
4. DOC-457: `getPublicPlans`, `getProofStats` and `getOverview` fall back to fixtures on any failure, not only on 404/405/501 (already in `bff.md` §4.2).
5. DOC-458: `set SHARWA_LIVE_MODULES=&& npm run dev` (recommended in `b2b-check.ts:78` and `bff.md` §6.3) deletes the variable, so `.env.local` applies again; only the `=none` form forces mocks. Only `b2b-check.ts` of 43 check scripts has `requireMocks()`.
6. DOC-459/461: `.env.example:79` lists 35 of 39 keys (missing `inventory`, `locations`, `returns`, `wallets`); `.env.example:15` quotes «غير متاح بعد» without the full stop the code has.
7. DOC-463: `ready-api-v1.md` rows #11/#13 already carry INT-016; other INT changes are missing; row #2 now includes `image` and follows `sort_order` (`bff.md` §5.3 says unchanged); rows #8–#10 are now served by `views_design.py` behind the `design` key, not passthrough.
8. DOC-463: Django can return courier `rejection_reason: geo_required` (`shipment_state_service.py:215`), absent from the Zod `REJECTION_REASONS`.
9. DOC-463 (possible live bug, not reproduced): `StaffLoginView` clears `is_merchant_authenticated` (`views_auth.py:330`) while `MerchantAPIMixin.check_merchant` requires it (`views.py:369-376`), so a JSON-login staff member may get 401 on B2B draft rows #19–#21; `test_b2b_api.py` sets the flag and masks it.

**Decisions pending (fares)**
- Production `client_max_body_size`: 8M (roadmap) or 55m (repo)?
- Refresh `ready-api-v1.md` from the audit's §6 or retire it; keep rows #8–#10 on the Ready list?
- Live-check the B2B staff-session 401 and, if real, add it to the Step 52 fixes.
- Step 52 scope: `.env.example` (DOC-461), `account/stores` removal set (DOC-462), courier `geo_required` in Zod, `requireMocks()` in the other check scripts, the `none` form in `b2b-check.ts`.
- Per-module rollback in production exposes fixtures — accept as emergency-only?

## 2026-10-27 — Official Step 06 · M-1 Foundations · 3.1 System overview + 3.2 Multi-tenant architecture (DOC-444 → DOC-454)

**Ticked**: DOC-444 → DOC-454 (11 tasks) — roadmap status 75 / 536.

**Added** (all under `docs/architecture/`)
- `00-system-overview.md` (DOC-444): components, host map, the four request paths with sequence diagrams, path conventions, trace-a-screen recipe, legacy HTML surfaces.
- `01-domain-map.md` (DOC-445): 16 domains × 49 INT tasks × live keys, provider files, dates, totals, dependency graph.
- `02-integration-protocol.md` (DOC-446): the mock-adapter pipeline as the standard for future modules, QA gates, write-up template, `[NEEDS BACKEND]` convention.
- `03-phase-history.md` (DOC-447): phases, timeline, checkpoints US1–US5 and Phase 6 with re-verification commands.
- `10-multi-tenancy.md` (DOC-448 `#schemas`, DOC-449 `#resolution`): model placement register, middleware chain, probe matrix.
- `11-provisioning.md` (DOC-450): registration → provisioning state machine, sweeper, setup token, re-provision.
- `12-custom-domains.md` (DOC-451): claim → DNS → routing → TLS, state machine, primary domain.
- `13-cross-schema-access.md` (DOC-452): console reads into store schemas, rules and code pattern.
- `14-store-lifecycle.md` (DOC-453): suspend / deactivate / close / reinstate, custody, guards.
- `15-plans-and-features.md` (DOC-454): feature decision engine, plans and subscriptions, feature-code register.

**Changed**
- `docs/api/domains/03-catalog/m05-organization.md`: related-pages link fixed from `architecture/bff.md` to the planned `architecture/20-bff.md`.
- `specs/003-documentation/documentation-roadmap.md`: ticks, status notes, status line.

**Checks run**: Arabic messages were copied from the code; every internal link resolves or points to a page planned in the roadmap / `architecture/README.md`; no secrets or real data; nothing was run (the shell on the user's computer was unavailable), so checkpoint states in `03-phase-history.md` are marked "not re-run".

**Discrepancies found**
1. DOC-445: the roadmap's "28 migrations" counts ledger rows (inventory A.9); there are 32 files (`products/0211`–`0215` is one row), and INT-006's `products/0208`–`0210` are missing from the ledger.
2. DOC-445: `.env.example` lists 35 live keys, the code 39 (already tracked as DOC-461).
3. DOC-446: `[NEEDS BACKEND]` was not cleared — 67 markers remain in 35 of the 127 frontend files read (for example `product-editor.tsx:379`), and `needs-backend-inventory.md` is still dated 2026-10-19 with 353 rows.
4. DOC-446: "mock aligned" is not universal — M05 and M37 fixtures still differ from Django (`src/mocks/product-extras/state.ts:216`).
5. DOC-447: `integration-tasks.md` records the US1–US5 checkpoints as goals with no result or date; the page says "recorded", not "verified".
6. DOC-448: market categories live in the `marketing` app, not `appstore`; `sharwapay` has no separate audit model (the transaction ledger is the trail).
7. DOC-448: the INT-021 bug class is still live in two writers that read `connection.schema_name` inside `schema_context('public')` and store `WaybillRegistry.tenant_schema_name = 'public'`: `carrier_service.py:175-179` (`issue_external_waybill`) and `shipping_billing_service.py:110-113` (Sharwa Ship).
8. DOC-449: host resolution is django-tenants' `TenantMainMiddleware`; `TenantHeaderOverrideMiddleware` only handles `/api/` requests with `X-Store-Domain`. `tracking` in `/config/` comes from `StoreConfigView`, not `StoreConfigSerializer`.
9. DOC-450: `m02-onboarding.md` draws the sweeper as `provisioning → pending`; the sweeper only re-queues the task, which sets `provisioning` again (`tenants/tasks.py:207-234`). Console re-provision is not "verbatim" the admin action: the admin re-queues any non-ready store, the console refuses an in-progress store that is not stalled.
10. DOC-451: nothing moves a claim to `active` in the background — the screen's «نتحقق من النطاقات قيد الانتظار تلقائياً كل 30 ثانية.» only re-reads the list; status changes only through `verify/`. The first claim state is `pending_dns`, not `pending`.
11. DOC-452: the M45 dues detail and actions read store schemas with a bare `schema_context` and no savepoint guard (`console_money_service.py:254`, `:334`) — a `ready` store with a missing schema answers 500.
12. DOC-453: the lifecycle is suspended → deactivated → closed (closed is final, reinstate from suspended or deactivated), not active / deactivated / reinstated.
13. DOC-454: the decision order is override → kill switch → `requires_plan` → plans-off → plan cell (`billing/models.py:200-210`), not kill switch → override → plan → default. `assign_plan` only clears `is_current`; cancel-with-date is done by the console's `assign_subscription`.
14. DOC-454: the API checks 35 codes (also `reports`, `affiliates`, `influencers`), not 32; 5 seeded codes are checked by no route (40 seeded).

**Decisions pending (fares)**
- Add the two `WaybillRegistry` writers (discrepancy 7) and the unguarded dues reads (11) to the Step 52 fix list? Check existing `WaybillRegistry` rows for `public`.
- Host-only requests to an inactive store are not refused by any middleware — enforce?
- Background re-verification of `pending_dns` / `verifying` domains, or change the screen text? Require `SHARWA_EDGE_IP` in production? Mirror a console-set primary domain to `StoreSetting.custom_domain`?
- Clean up the leftover `[NEEDS BACKEND]` markers and regenerate `needs-backend-inventory.md` (code/spec change)?
- Run the checkpoint commands in `03-phase-history.md` so they can be marked verified?
- `grace_period_ends_at` is never acted on — fix the suspend copy or add a job? Should plans-ON also assign stores still provisioning? Move cancel-with-date into `Subscription.assign_plan`?
- Restate "28 migrations" as 32 files and add `0208`–`0210` to the migrations ledger (DOC-508 → 510)?

## 2026-10-27 — Re-sync with `execution-plan.md` (no documentation content changed)

Runs 04 → 08 were started from prompts whose step numbers and subsection labels did not match `execution-plan.md`. Each run followed its DOC range, so every ticked task was written against its own roadmap task and the code; only the order differed from the plan. fares chose to **keep the work** (no rollback) and re-sync the labels.

| Official step | Milestone · subsection | DOC range | State | Written in run |
|---|---|---|---|---|
| 01 | M-1 · 0.1 Documentation home, structure and ownership | DOC-001 → 006 | complete (6/6) | 01 |
| 02 | M-1 · 1.1 API documentation tooling | DOC-007 → 014 | 4/8 — waiting: DOC-007 & DOC-014 approval, DOC-011 & DOC-012 live Newman run | 02 |
| 03 | M-1 · 1.2 Authentication & identity flows | DOC-015 → 025 | complete (11/11) | 03 |
| 04 | M-1 · 1.3 Cross-cutting API conventions | DOC-026 → 039 | complete (14/14) | 04, 05 |
| 05 | M-1 · 1.4 BFF layer reference | DOC-040 → 047 | complete (8/8) | 05, 06 |
| 11 | M-2 · 1.5 Domain 1 API + 1.6 Domain 2 API | DOC-048 → 059 | complete (12/12) | 06, 07 |
| 17 | M-3 · 1.7 Domain 3 API (part A: products, organization) | DOC-060 → 068 | complete (9/9) | 07, 08 |

**Next**: official Step 06 — M-1 · 3.1 System overview + 3.2 Multi-tenant architecture (DOC-444 → 454). From now on, entries use the official step numbers.

**Changed**
- `docs/CHANGELOG.md`: the headings of runs 04 → 08 now name the official step(s), milestone and subsection they covered; their bodies are unchanged.
- `specs/003-documentation/documentation-roadmap.md`: status line; the task notes of runs 04 → 08 now read "written in run NN = official Step XX".

**Known label drift kept as is**: pages written in runs 04 → 08 say "Last verified against code: … (step NN)" and "Reported in step NN". There, NN is the **run** number; use the table above to find the official step.

## 2026-10-27 — Run 08 → official Step 17 (completes it) · M-3 Merchant core · 1.7 Domain 3 API, part A: products, organization (DOC-066 → DOC-068)

This step follows `execution-plan.md` (**Step 17**: M-3 Merchant core · 1.7 Domain 3 API, part A: products, organization · DOC-060 → 068). DOC-060 → DOC-065 were already written in the previous prompt step (logged as "Step 07"), so only DOC-066 → DOC-068 remained. From here the prompt step numbers and the official plan numbers differ; the official plan step is named in each entry.

**Ticked**: DOC-066, DOC-067, DOC-068 (3 tasks) — roadmap status 64 / 536. Official Step 17 is now complete.

**Added**
- `docs/api/domains/03-catalog/m37-advanced-products.md` (DOC-068): module overview, gate chain, the 18-row M37 route table, `#bundles` (bundle components GET/POST/PATCH/DELETE, `#bundle-total` step-by-step computation with worked examples, `#bundle-changelog`), migrations and open items. Sections `#compatibility`, `#personalization`, `#auction`, `#serials`, `#import`, `#storefront-auction` and `#contract-notes` are stubs for official Step 18 (DOC-069 → 076).

**Changed**
- `docs/api/domains/03-catalog/m05-organization.md`: `#brands-tags` (DOC-066: brands, tags, full merge semantics) and `#collections-badges` (DOC-067: collections, badges, the complete 15-row BFF table) replace the stubs; header, route table, migrations (`Tag.last_used_at`, `Collection.product_order`) and open items updated. The category section is unchanged.
- `specs/003-documentation/documentation-roadmap.md`: ticks, status notes, status line.

**Checks run**: Arabic messages were copied from the code; test counts were taken from the test files (no test was run — the shell on the user's computer was unavailable); internal links resolve or point to roadmap-listed pages; no secrets or real data.

**Discrepancies found**
1. DOC-068: the roadmap says every bundle write logs the change under the actor. `POST` and `DELETE` do; `PATCH` (quantity / optional flag) does not, in Django or in the mock.
2. DOC-068: the mock bundle total uses the raw component price (`state.ts:216`); Django converts each component to the bundle's currency and uses formula prices.
3. DOC-068: `Product.bundle_total_price()` / `bundle_components_total()` use raw prices without conversion; the API does not call them and no caller was found in the files read.
4. DOC-068: the roadmap calls the item-route kwarg `<cid>`; in the code it is `row_id`, the `BundleComponent` id, not the component product id.
5. DOC-068: a numeric `quantity: 0` on `POST` is read as `1`, while the string `"0"` is refused. The editor always sends strings.
6. DOC-066: the `serializers_catalog.py` docstring says the mock is the validation reference, but for brands and tags the mock answers `200` on deleting an unknown id (Django `404`), has no 100-character brand-name limit, never checks tag slug clashes (Django suffixes `-2`) and derives `last_used_at` from product updates (Django stores a timestamp).
7. DOC-067: for collections and badges the mock deletes always succeed (Django `404`), has no collection-name checks and no list limits, and rejects an empty badge colour (Django resets it to `#64748b`).
8. DOC-067: collection `display_price` formats the raw `Product.price` (`serializers_catalog.py:454`), not the effective price the docstring promises, so formula-priced products can differ from the product list.
9. DOC-067: storefront cards carry `badges[{name,color}]` for manual badges only; the three dynamic badges appear only on the dashboard product detail.

**Decisions pending (fares)**
- Align the tag slug behaviour (a taken tag slug is silently suffixed; a taken brand or collection slug is refused)?
- Should deleting a brand, tag or badge, merging tags, and `PATCH` on a bundle component write a change-log row? Today none does.
- Should the mock bundle total use Django's currency and formula rules?
- Is `Product.bundle_total_price()` dead code?
- Carried over from the previous entry: the store-pin check in `CatalogAPIMixin.gate()`.

## 2026-10-27 — Run 07 → official Step 11 (DOC-056 → 059, completes it) + official Step 17 (DOC-060 → 065) · M-2 Buyer journey · 1.6 Domain 2 API / M-3 Merchant core · 1.7 Domain 3 API part A (DOC-056 → DOC-065)

The step prompt names subsection "2.3 Inventory & stock management APIs", but the roadmap puts DOC-056 → DOC-059 in section 1.6 "Domain 2 API" (command palette, notifications, multi-store rollup), DOC-060 → DOC-065 in section 1.7 "Domain 3 API" (Products Phase A, catalog categories), and the inventory APIs in section 1.14 "Domain 10 API". Roadmap section 2.3 is the merchant Catalog guide. As in Step 06, the DOC range was followed. `execution-plan.md` also lists these ids under Steps 11 and 17.

**Ticked**: DOC-056 → DOC-065 (10 tasks) — roadmap status 61 / 536.

**Added**
- `docs/api/domains/02-dashboard-shell/m48-search.md` (DOC-056): `GET /api/v1/search/`, Arabic normalisation on both sides, permission trimming for orders, customers and products, BFF `search` row, 7 tests.
- `docs/api/domains/02-dashboard-shell/m49-notifications.md` (DOC-057, DOC-058): `#model` (`Notification`, `NotificationRead`, migration `0216`, throttled sync, the 11 kinds with source, audience and resolve rule) and `#routes` (list, summary, read-all, read; 4 BFF rows; 7 tests).
- `docs/api/domains/02-dashboard-shell/m43-multi-store.md` (DOC-059): `GET /api/v1/merchant/stores/`, owner-only gate, account rule, range rules, linked / unlinked / staff responses, 4 tests.
- `docs/api/domains/03-catalog/m04-products.md` (DOC-060 → DOC-064): all 30 Phase A routes, list and 7 bulk actions, editor payload, variants / dictionary / templates / sectors with every 409, gallery, stock route and formula preview, migrations `0211`–`0215`, 30 tests.
- `docs/api/domains/03-catalog/m05-organization.md` (DOC-065): overview, gate chain and the 15-route table for the whole M05 module, `#categories` (CRUD, `reassign_to` / `children`, reorder); `#brands-tags` and `#collections-badges` are marked stubs for Step 17.

**Changed**
- `specs/003-documentation/documentation-roadmap.md`: ticks, status notes, status line.

**Checks run**: Arabic messages were copied from the code; test counts were taken from the test files (no test was run — the shell on the user's computer was unavailable); internal links resolve or point to roadmap-listed pages; no secrets or real data (the only phone value is the fixture `967700000001`).

**Discrepancies found**
1. The step prompt's subsection label does not match the roadmap (see the first paragraph).
2. DOC-057: `approval_pending` is not limited to the approver role. The owner sees every approval notification, and a request with no `approver_role` is visible to all staff (`notification_service.py:289`).
3. DOC-059: an invalid `from` / `to` does not reset both to the last 30 days; the two are parsed independently, so one valid parameter is kept.
4. DOC-059: the screen header reads «كل متاجري» (`stores-screen.tsx:41`), while the roadmap and glossary say «متاجري».
5. DOC-060: the M04 Step 3 note has no route list to copy; the list was built from `api/urls.py` and `PRODUCTS_LIVE_RULES`. The note also says 25 tests; the code has 30 (`MinimumPayloadTests` adds 5).
6. DOC-061: product reads and the change log need `inventory.view`; only the dictionary, templates, sectors and formula preview are readable by any session.
7. DOC-062: the editor form requires `name`, `price`, `category_id` and `unit` (no template); Django requires only `name` and `price`.
8. DOC-062: editor images are multipart files at 5 MB each. Base64 appears only in quick add and option images (5 MB decoded). 8 MB is the request-body bound.
9. DOC-065: the mock docstring says `children=lift|grandparent`; the mock body and Django use `grandparent|root`.
10. DOC-065: SEO-limit messages differ between the mock (`70 حرفاً على الأكثر.`) and Django (`العنوان 70 …`, `الوصف 160 …`, `الكلمات 255 …`); the mock is also narrower than Django on category PATCH, DELETE and reorder checks.
11. DOC-065: `reorder` accepts a move that creates a same-name sibling (PATCH rejects it), and a move without `parent_id` moves the category to the root.
12. Bulk `set_category` with no `category_id` clears the category on every selected product (documented as-is).

**Decisions pending (fares)**
- Correct the roadmap wording for DOC-060, DOC-061 and DOC-062 (discrepancies 5–8)?
- `CatalogAPIMixin.gate()` checks only `is_merchant_authenticated`; it does not compare `auth_tenant_schema` with the current store, unlike the dashboard `viewer()`. Verify and add to Step 52's fix list?
- Should bulk `set_category` reject a missing `category_id`, and should `reorder` reject a same-name move?
- Align the multi-store screen name («كل متاجري» in code, «متاجري» in docs)?

## 2026-10-27 — Run 06 → official Step 05 (DOC-043 → 047, completes it) + official Step 11 (DOC-048 → 055) · M-1 Foundations · 1.4 BFF layer reference / M-2 Buyer journey · 1.5 Domain 1 API + 1.6 Domain 2 API (DOC-043 → DOC-055)

The step prompt names subsection "2.2 Catalog & product domain APIs", but DOC-043 → DOC-047 are in roadmap section 1.4 "BFF layer reference", DOC-048 → DOC-053 in section 1.5 "Domain 1 API" (public & onboarding) and DOC-054 → DOC-055 in section 1.6 "Domain 2 API" (dashboard shell). The catalog and product domain pages start at DOC-060. The DOC range was followed.

**Ticked**: DOC-043 → DOC-055 (13 tasks) — roadmap status 51 / 536.

**Added**
- `docs/api/domains/01-public-onboarding/m01-landing.md` (DOC-048): `public/plans` and `public/stats`, the feature-listing rules, caching on both sides.
- `docs/api/domains/01-public-onboarding/m47-tenant-guard.md` (DOC-049): gate chain, the `/config/` probe, `probeStore` outcomes, middleware messages, the HEAD poll, the 2026-09-16 and 2026-10-20 fixes.
- `docs/api/domains/01-public-onboarding/config.md` (DOC-050): the 40 fields emitted by `/api/v1/config/` with the owner of each, sections, the Next-owned consumers (manifest, `/icon`, `/sw.js`).
- `docs/api/domains/01-public-onboarding/m02-onboarding.md` (DOC-051 → DOC-053): `#register` (market categories, legacy `check-subdomain`, register), `#otp` (verify, resend, lock-out, the resend-410 recovery), `#provisioning` (status route, `setup_token`, queue and sweeper, poller policies, lifecycle diagram).
- `docs/api/domains/02-dashboard-shell/m03-overview.md` (DOC-054, DOC-055): overview, refresh, counters, the owner and staff matrix, and `#deprecated` for the superseded `account/stores` route.

**Changed**
- `docs/api/overview/bff.md`: the old "Not covered here" section is replaced by `#django-first` (DOC-043), `#passthrough` (DOC-044), `#mock-runtime` (DOC-045), `#buffering` (DOC-046) and `#live-keys` (DOC-047, the 39-key map); related pages extended.
- `specs/003-documentation/documentation-roadmap.md`: ticks, status notes, status line.

**Deprecation record (DOC-055)**: the BFF route `GET /api/bff/account/stores` is **superseded** by `GET /api/v1/merchant/stores/` through the BFF `merchant/stores` (M43, INT-049; `useLinkedStores`). It has no Django route, no confirmed consumer, and answers `401` / `[]` for staff / `501` (owner, mocks off) / a three-store fixture (owner, mocks on). It is a **removal candidate** (tracked as DOC-462): `src/app/api/bff/account/stores/route.ts`, `src/mocks/dashboard/stores.ts` and the `accountStore*` exports of `schemas.ts`. No code was changed in this step.

**Checks run**: every quoted Arabic message was copied from the code; limits, TTLs and thresholds were re-read in `views_onboarding.py`, `tenants/provisioning.py`, `tenants/tasks.py` and `views_dashboard.py`; the live-key map was built from the BFF route files and `api/urls.py`; internal links resolve or point to roadmap-listed pages.

**Discrepancies found**
1. The step prompt's subsection label does not match the roadmap (see the first paragraph).
2. `/config/` never emits `gifting_enabled` / `loyalty_enabled`, although the Zod schema declares them and the storefront layout reads them.
3. `.env.example` lists 35 live keys; the code has 39 (missing `inventory`, `locations`, `returns`, `wallets`).
4. `src/app/api/bff/README.md` is stale: dashboard, auth and account rows still say "mock", and `public/plans` + `public/stats` say "target → mock".
5. The mock OTP lifetime and lock-out (300 s; 5 wrong codes → 60 s) differ from Django (600 s; 3 wrong codes → 600 s).
6. The provisioning-status BFF turns every non-OK Django answer for a signed token (429 throttle, 400, 5xx) into a final `404` «لم نجد طلب التأسيس هذا.».
7. On the Django-first adapters a real Django resource `404` is read as "route not shipped" (fixture with mocks on, `501` with mocks off).
8. `ready-api-v1.md` is stale for rows #1, #3–5, #7–10 and #15–29.
9. The roadmap says plans and stats are both cached for one hour; Django caches only stats (3600 s). Next caches both (`cacheLife("hours")`).
10. The landing fetchers and `getOverview` fall back to the fixture on any failure, not only on 404/405/501.
11. The tenant probe maps a `failed` store and an unexpected `5xx` to the same "provisioning" outcome.
12. `pending_approvals` is not zeroed by a permission key for staff; it is narrowed to the staff member's own approver roles.
13. The refresh cooldown key is set before the numbers are recomputed, so a failed recomputation still spends the five minutes.
14. 46 deeply nested BFF route files (for example `catalog/products/[id]/auction`, `checkout/sharwa-pay/otp/send`) could not be read in this step; their adapter type is taken from the BFF README and flagged in `bff.md`.

## 2026-10-27 — Run 05 → official Step 04 (DOC-037 → 039, completes it) + official Step 05 (DOC-040 → 042) · M-1 Foundations · 1.3 Cross-cutting API conventions / 1.4 BFF layer reference (DOC-037 → DOC-042)

The step prompt names milestone M-2 and subsection "1.4 Error handling & standard responses", but the roadmap has no such subsection. DOC-037 → DOC-039 belong to section 1.3 "Cross-cutting API conventions" (left over from Step 04) and DOC-040 → DOC-042 to section 1.4 "BFF layer reference". The DOC range was followed. DOC-043 → DOC-047 (the rest of 1.4) are for the next step.

**Ticked**: DOC-037 → DOC-042 (6 tasks) — roadmap status 38 / 536.

**Added** (under `docs/api/overview/`)
- `errors.md`: how an error travels, the `ApiError` parsing rules, 13 body shapes (`{detail}`, field errors, dotted keys, per-line, per-row, `code` as a machine code and as a field, `{detail, level}`, `{codes, duplicates}`, `CashLiquidityError`, `retry_after`, non-JSON), every status code (400, 401, 403, 404, 405, 409, 410, 428, 429, 500, 501, 502, 503) with example bodies and consuming screens, client defaults, rules for a new client (DOC-037).
- `bff.md`: `#liveormock` (switches, flow, `forwardLive`, BFF-own answers, one worked example per method), `#products-rules` (21 + 2 + 14 rows, dispatch order, `applyTemplateLive`), `#platform` (host gate, three groups, every console route mapped) (DOC-040, DOC-041, DOC-042). The sections for DOC-043 → DOC-047 are not written yet.

**Changed**
- `docs/api/overview/conventions.md`: new `#uploads` (per-route table, import and feed reader limits) and `#normalisation` (Arabic rules, four phone normalisers, equivalent inputs) sections (DOC-038, DOC-039); the header note was updated and the "BFF buffers up to 8 MB" sentence was corrected.
- `specs/003-documentation/documentation-roadmap.md`: ticks, status notes, status line.

**Checks run**: every quoted Arabic message was copied from the code and re-grepped; every BFF → Django path in the products and platform tables was checked against `api/urls.py`; internal links resolve or point to roadmap-listed pages; Western digits only; no secrets, tokens or real phones (fixtures only). Screens that consume `401`, `405` and `503` bodies were not found in the code read; `errors.md` says so.

**Discrepancies found**
1. The step prompt's subsection label does not match the roadmap (see the first paragraph).
2. The roadmap says the console `401` carries `WWW-Authenticate: Session`. Django sends it, but the BFF does not forward `www-authenticate`, so the browser never sees it.
3. The roadmap says the BFF buffers write bodies "8 MB max". The BFF buffers with no limit; the 8 MB ceiling is Nginx (`client_max_body_size 8M`) and `DATA_UPLOAD_MAX_MEMORY_SIZE`.
4. The 20,000-row limit applies to the products import only. Supplier feeds use the same reader with 200,000 rows and 50 MB; Windows-1256 detection and delimiter sniffing live in the shared `FeedReader`.
5. The roadmap lists one 503 cause; the code has two Sharwa AI messages (console URL unset, SSO not configured), the DNS check, and the HTML provisioning page. There are eight different 502 WhatsApp sentences.
6. `501 «غير متاح بعد.»` is produced only by the BFF (mocks off); Django sends no 501.
7. `code` has two meanings: a machine-code string (seven families: `feature_disabled`, `discount_exceeds_limit`, `otp_required`, `setup_required`, `already_set`, `setup_token_invalid`, `has_pending_withdrawal`) and an array of messages under a field named `code` (OTP verify).
8. `parseApiError` copies string siblings (`code`, `level`, `sent_to`) into `fields`, drops arrays of objects (read from `body`), and ignores the body `retry_after`.
9. The sections serializer returns flat dotted keys (`items.0.title`).
10. `SHARWA_LIVE_MODULES=none` (glossary wording) has no special meaning in code.
11. `normalizePhone` (frontend) and Sharwa Pay `normalize_phone` prefix `967` to a local Saudi `05…` number; the doc comment on `normalizePhone` says it becomes `966…`.
12. The SQL side of the server search does not map digits; the Python and TypeScript sides do.
13. Section item images, the store logo, offer images and the checkout receipt get no Pillow content check; product, base64, and Sharwa Pay receipt images do. The checkout receipt takes JPEG and PNG only.
14. The mock `reports/schedules*` handlers gate on `reports.view`; Django gates the same routes on `reports.export`.

## 2026-10-27 — Run 04 → official Step 04 (DOC-026 → 036) · M-1 Foundations · 1.3 Cross-cutting API conventions (DOC-026 → DOC-036)

The step prompt names subsection 2.1, but DOC-026 → DOC-036 are roadmap section 1.3 "Cross-cutting API conventions" (M-1). The DOC range was followed. DOC-037 → DOC-039 (errors, upload limits, normalisation) are not part of this step.

**Ticked**: DOC-026 → DOC-036 (11 tasks) — roadmap status 32 / 536.

**Added** (all under `docs/api/overview/`)
- `plan-features.md`: how a client learns what is on, seeding, the 40 seeded codes in sub-tables per module group, codes no route checks, modules without a plan gate, caller quick reference (DOC-027).
- `permissions.md`: the 36 permission keys mapped to endpoints, system roles, POS discount ceiling and approvals, sensitive keys, behaviour limits, keys no route uses, owner-only sentences (DOC-028, DOC-029).
- `money.md`: currencies, wire formats, `format_money`, per-currency totals, exchange rates, the two conversion engines and a per-module table, worked examples (DOC-030, DOC-031).
- `idempotency.md`: 15 mechanisms with key name, location, replay result and misuse behaviour (DOC-032).
- `conflicts.md`: the two kinds of 409, version-conflict and state-conflict tables, row locks, recovery sheet (DOC-033).
- `pagination.md`: parameters, five envelopes with variants, per-module defaults and maxima, fixed windows, cursors, client rules (DOC-034).
- `rate-limits.md`: CGNAT stance (`#cgnat`), `Retry-After` vs `retry_after`, every limited route with its number, the generic DRF throttle (DOC-035).

**Changed**
- `docs/api/overview/conventions.md`: new `#gates` section (flow diagram, status and body table, per-module gate orders) and `#headers` section (caching and security headers) (DOC-026, DOC-036). The versioning text from Step 02 was kept; its changelog links now resolve to this file.
- `specs/003-documentation/documentation-roadmap.md`: ticks, status notes, status line.

**Checks run**: every figure, constant and Arabic message was read from the Django code and re-grepped; internal links resolve or point to roadmap-listed pages (`errors.md`, `bff.md`, domain pages, glossary); Western digits only; no secrets, tokens or real phones (fixtures only). The review copy of the backend is incomplete (see discrepancy 17), so counts that depend on migrations are flagged in the pages.

**Discrepancies found**
1. Seven different gate orders exist; the roadmap assumes one (session → plan feature → permission → owner-only → resource).
2. The channels inbox checks `channels.inbox.access` in the route and then narrows again in the service.
3. Five plan features are seeded globally off: `multi_location`, `staff_rbac`, `social_channels`, `marketplaces`, `dropshipping`.
4. The roadmap omits 8 plan-feature codes (it lists 32, the code seeds 40) and 7 permission keys.
5. `orders.delete` and `customers.manage_tier` are referenced by no route; code comments say "35 keys", the catalog has 36.
6. "Cached for 1 h" is true only for stats and location-day Redis caches; plan data is not cached.
7. `X-Robots-Tag: noindex, nofollow` is sent; ETag and `If-None-Match` are inert.
8. Optimistic locking uses `version` in requests and `current_version` in 409 bodies; `version` is required for orders and approvals but optional for theme and returns.
9. Three `next` formats (string, integer, full URL) plus storefront reviews with no `count`.
10. Dropshipping converts with the stored `usd_to_sar` rate, not a "daily" one (the glossary repeats "daily").
11. YER labels differ (already reported in Step 01); YER decimals differ between the two conversion engines; the legacy `get_formatted_price` omits « ر.ي».
12. The report and supplier permission keys are not granted to manager roles in the available migrations (confirm on a live store).
13. `message.send` has alert (200) and hard (500) limits that are never recorded or checked; only `customers.export` is enforced.
14. Rate limits: the reports `feature_code` field is unused; comments in `views_onboarding.py` still quote the old strict per-IP values, the constants are the loose CGNAT ones.
15. The DRF anonymous throttle returns an English body without the Arabic `detail` style and is the only generic cap on public reads (120 per minute per IP).
16. Rate-limit responses are inconsistent: some routes send `Retry-After`, some `retry_after`, many neither.
17. The review copy of the backend lacks `products` migration 0217, billing 0001 and 0012 and others; the counts of 40 plan features and 36 keys depend on the files available.

## 2026-10-27 — Step 03 · M-1 Foundations · 1.2 Authentication & identity flows (DOC-015 → DOC-025)

**Ticked**: DOC-015 → DOC-025 (11 tasks) — roadmap status 21 / 536.
**Written, awaiting a decision**: DOC-024 (personal access tokens are documented as issued but not accepted by any route; fares decides whether to build PAT authentication).

**Added**
- `docs/api/overview/auth.md`: identity matrix with a sequence per identity (DOC-015), tenant pinning and every pre-view 404/403/503 (DOC-020), Sharwa Pay customer session summary (DOC-022), courier agent and multi-store owner failure tables (DOC-023), personal access tokens (DOC-024).
- `docs/api/overview/otp.md`: one row per OTP family (onboarding, owner reset, COD, checkout Sharwa Pay, wallet/loyalty, engagement, POS large refund, Sharwa Pay customer), per-family details, storage comparison, curl example (DOC-025).
- `docs/api/domains/02-dashboard-shell/m03-auth.md`: owner login/logout/me/setup-password (DOC-017), staff login with roster and lockout (DOC-018), forgot/reset password (DOC-019).
- `docs/api/domains/16-platform-console/auth.md`: roles, gate chain, lockout, 403 matrix by area, audit actions (DOC-021).

**Changed**
- `docs/api/overview/csrf.md`: new «The handshake end to end» section (settings, flow, who enforces it, curl walkthrough, sequence); the Postman and troubleshooting sections were kept (DOC-016).
- `specs/003-documentation/documentation-roadmap.md`: ticks, status notes, status line.

**Checks run**: every quoted Arabic message was copied from the code and grepped; internal links resolve or point to roadmap-listed pages (`rate-limits.md`, `bff.md`, `permissions.md`, `conventions.md#gates`, `m43-multi-store.md`, `m20-console.md`, `08-finance/m40-sharwa-pay.md`). No secrets, tokens or real phones (fixtures only).

**Discrepancies found**
1. The Sharwa AI console-token route only reads `auth_tenant_schema` (401 on mismatch); it does not write it. Owner routes accept a missing pin, the console-token route requires an exact match.
2. `enforce_roster_schedule` is a flag on the member in addition to `RosterSchedule` rows; no rows means no restriction.
3. Staff lockout has a per-IP counter of 20 besides the 5 per phone; a terminated member gets the generic inactive 403 only after a correct password.
4. No route accepts a personal access token; `last_used_at` is never written; `revoke_sessions` does not revoke tokens (terminate does).
5. Buyer OTP purposes `auction`, `wishlist`, `back_in_stock` are issued but never consumed.
6. `/register/status/<token>/` returns `setup_token` on every `ready` poll (valid 1 h).
7. Onboarding 410 has two meanings (pending request gone vs code older than 10 min).
8. The provisioning 503 is an HTML page, not JSON.
9. COD, checkout Sharwa Pay, wallet/loyalty and buyer codes are stored in plain text in the session; checkout and wallet 429 responses have no `Retry-After`.
10. Reset-password does not revoke the owner's other sessions.
11. The `me` Zod optional fields `max_discount_percent` and `behavior` are not returned by Django.
12. The forgot-password send-limit 429 always reports 600 s.
13. The fixture `ttl_seconds` is 300 while Django uses 600.
14. `WWW-Authenticate: Session` is sent by `ConsoleView` subclasses and logout, not by console login.
15. Storefront public views are CSRF-exempt (observation; confirm it is intended).
16. The roadmap names `test_dashboard_api.py` for DOC-017, but setup-password is tested in `test_onboarding_api.py` and owner login/me in `test_auth_api.py`.

## 2026-10-27 — Step 02 · M-1 Foundations · 1.1 API documentation tooling (DOC-007 → DOC-014)

**Approved before this step (ticked)**: DOC-002 language policy, DOC-005 contributing & Definition of Done, DOC-006 milestones.
**Ticked**: DOC-008, DOC-009, DOC-010, DOC-013 — roadmap status 10 / 536.
**Written, waiting**: DOC-007 (approval of the hybrid OpenAPI strategy), DOC-011 and DOC-012 (live Newman run against Django by fares), DOC-014 (approval of the versioning policy).

**Added**
- `docs/api/openapi/README.md`: decision record (hybrid strategy, options compared, measurements), pipeline, fragment format, vendor extensions, examples rule and the list of fixtures aligned in Phase 002.
- `docs/api/openapi/sharwa-v1.yaml` (generated; OpenAPI 3.1): 501 routes / 641 operations; 16 domain + 49 module tags; servers, security schemes and shared components; 12 operations documented (M25 Reports pilot + CSRF handshake). Valid with Redocly CLI and swagger-parser. Also `route-inventory.md` (generated) and `redocly.yaml`.
- `docs/api/openapi/src/00-base.yaml`, `02-auth.yaml`, `15-reports.yaml`: hand-written fragments.
- `docs/api/openapi/contract-diff.md` + `scripts/openapi-contract-diff.ts`: Django ⊆ Zod check. Reports: 9/9 operations, 0 drift; 4 injected drifts caught.
- `docs/api/openapi/examples/` + `scripts/openapi-examples.ts`: 14 fixture examples, each parsed with its Zod schema, deterministic.
- `scripts/openapi/route_inventory.py`, `scripts/openapi/build.py`, `scripts/openapi/postman.py`: generators with `--check` modes. They need PyYAML only (in the Django venv).
- `docs/api/postman/`: `sharwa.postman_collection.json` (generated: 641 requests + 3 smoke folders, 45 saved responses), `csrf-pre-request.js`, 6 environments (local/staging × store/platform/console), `README.md`.
- `docs/api/overview/csrf.md` (Postman section + troubleshooting), `docs/api/overview/conventions.md` (Versioning), `docs/api/CHANGELOG.md` (Phase 002 baseline 1.0.0, deprecations, open items).

**Changed**
- Root `README.md`: the backend is no longer described as read-only; links to Phase 002/003 specs and `docs/README.md`; generated-docs table lists the API artifacts.
- `docs/README.md`: approvals recorded for §4 and §6; developer index links the new pages.
- `specs/003-documentation/documentation-roadmap.md`: ticks, status notes, status line.

**Checks run** (documentation workspace, on copies of both repos): `tsc --noEmit` with the repo `tsconfig.json` on the two new TS scripts, clean; ESLint with the repo's script rules, clean; Newman 6 smoke run of the store folder against a CSRF-enforcing stand-in server, 5/5 requests and 4/4 assertions.

**Discrepancies found**
1. The roadmap assumed no OpenAPI dependency, but `drf-spectacular==0.30.0` is installed and serves `/api/schema/`, `/api/docs/`, `/api/redoc/` on every host, with no `DEBUG` guard. That is a decision for fares.
2. Inventory A.5 omits the plan feature `reports`, which gates all of M25.
3. The reports mock differs from Django in three places: the index requires `reports.view`; the export path does not check `export_enabled`; and a blank schedule email gets «أدخل بريداً إلكترونياً صحيحاً.» where Django sends «أدخل البريد المستلم.».
4. Personal access tokens `shw_pat_…` are issued (INT-022), but no `/api/v1` authentication class accepts them, so they are not declared as a security scheme.
5. The `api/views_auth.py` module docstring says the BFF reads CSRF from `/dashboard/login/`, while `src/lib/csrf.ts` uses `/api/v1/auth/csrf/` first, with that page only as the legacy fallback. The comment is stale.
6. Constitution principle V («Read-Only Backend Boundary») still describes the backend as read-only. The root README was fixed; the constitution was not touched.

## 2026-10-26 — Step 01 · M-1 Foundations · 0.1 Documentation home, structure and ownership (DOC-001 → DOC-006)

**Ticked**: DOC-001, DOC-003, DOC-004 (roadmap status 3 / 536).
**Written, awaiting approval**: DOC-002 (language policy), DOC-005 (contributing & Definition of Done), DOC-006 (milestones).

**Added**
- `docs/README.md` — index per audience, tree, domain slugs, relation to specs and both repos, language policy (§4), conventions (§5: templates, discrepancies, examples, RTL, screenshots `docs/guides/_assets/…`, Mermaid, links), contributing & Definition of Done (§6), provisional maintenance rule (§7).
- `docs/glossary.md` — platform, identity/role, currency/money and per-domain terms (Arabic ↔ English); M01–M49 ↔ INT-001…INT-049 ↔ domain ↔ live key ↔ route group.
- `docs/_templates/` — `README.md`, `api-endpoint.md`, `guide-page.md`, `architecture-page.md`, `runbook.md`.
- 57 folder `README.md` stubs under `docs/api/`, `docs/guides/`, `docs/architecture/`, `docs/ops/`. Each lists the planned pages of its folder with their DOC tasks.
- `docs/CHANGELOG.md` (this file).

**Changed**
- `specs/003-documentation/documentation-roadmap.md` — ticks, status line, new **Milestones** section (all 536 tasks tagged M-1…M-6), approval notes on DOC-002/005/006.
- `specs/003-documentation/execution-plan.md` — the step prompt's screenshot placeholder now follows `docs/README.md` §5.4 (`docs/guides/_assets/…`, as the roadmap's DOC-285 says) instead of `../_screenshots/`.

**Untouched**: the existing `docs/DELIVERY-REPORT.md`, `docs/lighthouse/` and `docs/visual-checks/` (Phase 1–8 artifacts), now linked from the tree in `docs/README.md`.

**Discrepancies found**
1. Yemeni currency labels: frontend `CURRENCY_LABELS` «ريال يمني (صنعاء)» / «ريال يمني (عدن)» vs Django `CURRENCY_CHOICES` «يمني صنعاء» / «يمني عدن» (`src/lib/schemas/money.ts` vs `products/models/base.py`). Recorded in the glossary §3.
2. Constitution principle II shows money as `1,250.00 ر.س`; Django `format_money` renders whole amounts without decimals (`1,250 ر.س`). Docs follow the code. Recorded in the glossary §3.
3. The repository `README.md` still says the frontend is a client of a Django backend that is "read-only, never modified from here". Since Phase 002 Claude also edits Django. Not changed (outside docs scope); for fares to decide.
