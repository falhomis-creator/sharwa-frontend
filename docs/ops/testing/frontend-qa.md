# Frontend QA gates and mock E2E scripts

> **Source**: DOC-521 · A.1 Step 4 · A.12 · A.2
> **Code**: `sharwa-frontend/package.json` · `README.md` ("Quality gates") · `eslint.config.mjs` · `eslint-rules/` · `scripts/*.ts` (49 files) · `src/proxy.ts`
> **Last verified against code**: 2026-10-27 (official Step 09) — **the scripts were read, not run** (no shell was available)

## 1. Purpose

Everything that must pass before a frontend change is committed, and the browser scripts that prove each module against the **mock** server. It answers three questions: what do I run before I commit, what does each script need and leave behind, and how do I switch a module to Django and check it. The Django side is in [`django-suites.md`](django-suites.md); the pipeline that could run all of it is in [`ci.md`](ci.md).

<a id="gates"></a>

## 2. The gates

Run from the repository root (`C:\sharwa_front\sharwa-frontend`). The first two are the mandatory ones of the integration protocol (step 4); the other three are in the README's "Quality gates" and are run "every phase, before you commit".

| Gate | Command | Passes when | On failure |
|---|---|---|---|
| Lint | `npm run lint` (`eslint`) | exit 0, no errors. Includes the custom rule `sharwa/tenant-cache-key` (FR-47.09: a cache key that could cross stores) | ESLint messages |
| Types | `rm -rf .next/types && npx next typegen && npx tsc --noEmit` (also `npm run typecheck`) | exit 0, no output. The README removes `.next/types` first so stale generated route types do not fail the check; `next typegen` then regenerates them, because the global `RouteContext` / `LayoutProps` helpers live there — without it `tsc` fails with `TS2304` on a fresh clone ([`../_verification.md`](../_verification.md#o-5)) | `tsc` error list |
| RTL | `npx tsx scripts/rtl-audit.ts` | prints `✓ RTL audit: 0 physical direction utilities, every directional icon mirrored` | `path:line` findings, then `✗ N RTL finding(s)`, exit 1 |
| Restrained UI | `npx tsx scripts/anti-ai-audit.ts` | prints `✓ Principle I (code): 0 gradients, brand colours, glows, glass, heavy shadows, emoji or filler outside the marketing surface` | `path:line [rule] why: text`, then `✗ N finding(s)`, exit 1 |
| Backend inventory | `npx tsx scripts/needs-backend-inventory.ts --check` | prints `✓ needs-backend-inventory.md is current` | `✗ needs-backend-inventory.md is stale — run: npx tsx scripts/needs-backend-inventory.ts`, exit 1 |

> ⚠️ `next.config.ts` sets `typescript.ignoreBuildErrors: true`, so `npm run build` **does not fail on type errors**. `tsc --noEmit` is therefore the only type gate: a build that passes proves nothing about types. (See also [`../dependencies.md`](../dependencies.md) §4.)

`rtl-audit` skips `src/components/ui` (generated primitives, reviewed by hand). `anti-ai-audit` skips the marketing surface (`src/features/landing`, `src/app/(marketing)`), `src/components/ui` and `src/mocks`.

Contract and documentation checks (not part of the commit gate, but part of Phase 003 and recommended for CI — [`ci.md`](ci.md)):

| Check | Command | Passes when |
|---|---|---|
| Zod ↔ OpenAPI | `npx tsx scripts/openapi-contract-diff.ts [--module <m>] [--verbose]` | every documented Django response is accepted by its Zod schema; prints `N operation(s) diffed · 0 drift(s) · coverage: x/y operations documented`; exit 1 on drift, 2 on a crash |
| OpenAPI examples | `npx tsx scripts/openapi-examples.ts --check` | every mock-fixture example parses with its Zod schema (`N/N examples valid`); without `--check` it writes `docs/api/openapi/examples/*` |
| Delivery report | `npx tsx scripts/delivery-report.ts` | regenerates `docs/DELIVERY-REPORT.md` (generator, no assertions) |
| Product minimum payload | `npx tsx scripts/product-minimum-check.ts [out.json]` | the editor form accepts only the four mandatory fields, each missing one fails with its Arabic message, and the payload is accepted by the mock `createProduct`; the payload is written to `out.json` so the Django test `api.test_products_api.MinimumPayloadTests` can post the same body |

The OpenAPI file itself is rebuilt with the Python scripts in `scripts/openapi/` (`build.py`, `postman.py`, `route_inventory.py`) — see `docs/api/openapi/` (DOC-009/013).

<a id="preconditions"></a>

## 3. What every browser script needs

41 of the 49 files drive Chromium through the Playwright **library** (`@playwright/test` is a dev dependency; there is no `playwright.config` and no `npx playwright test` — each file is a stand-alone program run by `tsx`). The common contract:

| Item | Rule |
|---|---|
| Command | `npx tsx scripts/<name>.ts [port]` — port defaults to `3000` (**`tenant-shell-check` defaults to `3100`**); `wallets-check` takes `[port] [store]`; `tenant-isolation-check` takes `[port] [rounds]` (default 3000, 5). Only `visual-check` has an npm alias: `npm run visual-check -- --slug … --url …`. |
| Server | `npm run dev` (or `npm start`) already listening on that port, with **mocks on** and the module under test **not** in `SHARWA_LIVE_MODULES`. Start it for mock work with `SHARWA_LIVE_MODULES=none` ([`../environment.md`](../environment.md#live-modules): `none` is simply an unknown word, which matches no module). |
| Browser | `SHARWA_CHROMIUM=<path to chrome>` if the file exists, otherwise Playwright's own Chromium. Windows: `set SHARWA_CHROMIUM=C:\path\to\chrome.exe&& npx tsx scripts/pos-check.ts 3000`. |
| Hosts | `*.localhost` names resolve to the loopback in Chromium, so no `hosts` entries are needed. Fixture stores: **`noor`** (main, luxury_boutique, full data), **`shop`** (modern_trust, empty store — used for empty states and isolation), **`glow`** (target of destructive writes so `noor` screenshots stay stable), **`console`** (platform console), **`localhost`** (platform origin: landing, register, Sharwa Pay). |
| Sessions | A cookie `sharwa_mock_session` with value `merchant` (owner), `staff` (cashier fixture) or `manager` («مدير المتجر»), set per `<store>.localhost`. Django does **not** know this cookie — against a live module the BFF answers 401. |
| Working directory | The repository root: screenshot folders are `process.cwd()/docs/visual-checks/<slug>/` and are created if missing. |
| Result | One line per assertion, `✓ label` or `✗ label`, then a summary; **exit 0** = all passed, **exit 1** = a failed assertion or a console error (most scripts ignore the console line of an expected 400/401/403/404/409 response). |
| Side effects | Mock state lives in the Next.js process (`globalThis`) and is lost when `next dev` restarts — a re-run on the same server sees what the previous run left. Screenshots are written into `docs/visual-checks/`; only `*.tmp.png` there is git-ignored, so a re-run shows modified images in `git status` — review before committing. |

<a id="static"></a>

## 4. Static and in-process scripts (no browser)

| Script | Needs | Output |
|---|---|---|
| `rtl-audit.ts`, `anti-ai-audit.ts` | nothing running | see §2 |
| `needs-backend-inventory.ts` | the module specs under `specs/001-sharwa-frontend-platform/modules/` | rewrites (or with `--check` compares) `specs/001-sharwa-frontend-platform/contracts/needs-backend-inventory.md` |
| `delivery-report.ts` | the module specs, `docs/visual-checks/`, `scripts/` | writes `docs/DELIVERY-REPORT.md` |
| `openapi-contract-diff.ts`, `openapi-examples.ts` | `docs/api/openapi/sharwa-v1.yaml`, the Zod schemas, the mock fixtures | see §2 |
| `product-minimum-check.ts` | the editor schema and the mock `createProduct` | see §2 |
| `tenant-isolation-check.ts [port] [rounds]` | a running server (no browser) | SC-009: 10 stores — `noor`, `shop` and 8 stores it registers through the mocked M02 wizard — hit in rotation and in parallel bursts, over `127.0.0.1` with an explicit `Host` header; each response must carry its own store name and none of the other nine; `exit 1` on a leak |
| `visual-check.ts` | a running page | `npm run visual-check -- --slug <s> --url <u> [--no-dark] [--viewports desktop,mobile,mobile-dark] [--cookie "k=v"] [--click "<sel>"] [--wait 800]`; writes `docs/visual-checks/<slug>/{desktop,tablet,mobile,desktop-dark}.png` and **fails** (exit 1) on a console error or a hydration warning, horizontal scroll, an interactive element shorter than 44 px on mobile, or a response ≥ 400; exit 2 on bad arguments |

<a id="scripts"></a>

## 5. The mock E2E scripts (module by module)

All 40 rows below use the contract of §3. "Module" names the M-number and the task (T-number) in the script's header.

| Script | Module / what it proves | Stores and sessions | State and re-running | Screenshots (`docs/visual-checks/…`) |
|---|---|---|---|---|
| `admin-billing-check.ts` | M46 plans, feature matrix, kill switch, bulk overrides, subscriptions, master switches, apps/billing overrides, market categories; operator read-only gate (T139) | `console` (superuser, operator) + `noor`; overrides touch only `glow`, `fit`, `books` | Restores every flag it flips; repeatable back to back | `46-plans/` |
| `admin-money-check.ts` | M45 dues (8 actions), M20 Sharwa Pay approvals, customer wallets, Sharwa Ship zones (T140) | `console` | Consumes seeded pending items but asserts behaviour, not counts; restores toggles; deletes its test zone | `45-dues/`, `20-admin/` |
| `admin-shell-check.ts` | M20 console shell: host isolation, login, gate, overview, ⌘K, one source of truth with the merchant side (T137) | `console` (superuser, operator), `noor`, `glow` | Flips a platform override and edits a zone to prove one source of truth; the header does not say whether it restores them | `20-admin/` |
| `admin-stores-check.ts` | M20 stores module: filters, bulk re-provision, feature override, store detail, deactivation lifecycle, webhook events (T138) | `console`; one extra store (`atyab`) | Restores everything it changes; repeatable | `20-admin/` |
| `affiliates-check.ts` | M17 affiliates and influencers (T147) | `noor`, `glow`, `shop`; merchant, staff, manager | Writes go to `glow` so `noor` screenshots stay stable | `17-affiliates/` |
| `apps-support-check.ts` | M30 app store, M31 Sharwa AI, M32 support sessions and tickets (T163–T165) | `noor`; merchant, staff, manager | Restores the store's apps / support mock state at the end | `30-apps/`, `31-ai/`, `32-support/` |
| `b2b-check.ts` | M36 B2B wholesale, dashboard part (T171) | `noor`, `glow`, `shop`; merchant, staff, manager | **Fails fast** (`requireMocks`) if `products` or `b2b` is live; writes go to `glow` | `36-b2b/` |
| `bookings-check.ts` | M26 bookings and appointments (T151–T153) | `noor`; merchant, staff, manager | Holds/books slots in mock state; restart the server for a pristine seed | `26-bookings/` |
| `bundles-check.ts` | M37 advanced product types + M36 tier prices (T172–T174) | `noor`; merchant, staff, manager | Screenshots use `caret: "initial"` (see §6) | `37-advanced-products/` |
| `catalog-orders-check.ts` | M04 · M05 · M06 · M48 · M49: product with variants → phone order → fulfilment → financial axis; 409 panel; category tree; ⌘K; bell (T081) | `noor`; merchant, staff | Creates a product and an order every run (mock state persists) | `05-organization/`, `06-orders/`, `48-command-palette/`, `49-notifications/` |
| `courier-check.ts` | M38 courier app on `noor.localhost/agent` (T175–T177) | `noor`; merchant, staff, manager | Mutates Sharwa Ship fixtures (picks rows by status, so re-runnable); restart for a pristine seed | `38-courier/` |
| `customers-check.ts` | M07 customers and CRM (T096–T098) | `noor`, `shop`; merchant, staff | Creates notes / flags in mock state | `07-customers/` |
| `domains-check.ts` | M19 domains, tracking, webhooks, integrations (T114–T116) | `noor`; merchant, staff | Runs on a fresh per-run store, so repeatable | `19-domains/` |
| `dropshipping-check.ts` | M29 dropshipping and supplier feeds (T162) | `noor`, `console`; merchant | Turns the `dropshipping` plan gate on through a console override and restores it | `29-dropshipping/` |
| `engagement-check.ts` | M42 wishlist, reviews, back-in-stock (T132–T134) | `noor`, as a buyer (no session cookie) | Mock state persists across runs | — |
| `expenses-check.ts` | M33 operating expenses (T168) | `noor`, `glow`, `shop`; merchant, staff, manager | Writes go to `glow`. No per-run tag in the code (see §8) | `33-expenses/` |
| `inbox-check.ts` | M27 unified inbox and social channels (T154–T156) | `noor`; merchant, staff, manager | Resets the inbox mock at the end (`POST /api/bff/inbox/_mock/reset`) | `27-inbox/` |
| `inventory-check.ts` | M21 inventory (T118) | `noor`, `shop`; merchant, staff | +12 restock, a write-off approval request remain in mock state | `21-inventory/` |
| `locations-check.ts` | M22 locations (T120–T122) | `noor` (+ `shop` gate); merchant, staff | Mock state persists | — |
| `marketing-check.ts` | M13 marketing hub (T102–T104) | `noor`, `shop`; merchant, staff | Uses a per-run `RUN` tag for created codes | — |
| `marketplaces-check.ts` | M28 marketplaces, Amazon / noon (T159) | `noor`, `console`; merchant | Turns the `marketplaces` plan on through a console override and restores it | `28-marketplaces/` |
| `onboarding-check.ts` | M02 onboarding wizard, timed end to end ≤ 60 s (T067) | `localhost` (platform origin), no session | Registers new stores on each run | `02-onboarding/` |
| `payments-check.ts` | M14 payments, payout accounts, merchant wallet, withdrawals, dues | `noor`, `shop`; merchant, staff | Links «الكريمي», creates a withdrawal, toggles switches (restored); a re-run skips the «غير مربوطة» half | — |
| `phase5-decisions-check.ts` | Phase 5 owner decisions of 2026-10-19 (owner-only screens hidden for staff, manager fixture, `www.` domains, report permissions, one payment-toggle surface) | `noor` | The header describes assertions only | — |
| `phase7-decisions-check.ts` | Phase 7 owner decisions of 2026-10-19 (POS gated by the `pos` feature, any-of nav gates, courier supervision gate, bids without OTP, 20 dropshipping feed fields) | `noor`, `console`; merchant, staff, manager | Flips features through the console bulk override and removes them before exit | — |
| `pos-check.ts` | M16 point of sale (T142–T144) | `noor`; merchant, staff, manager | Opens and closes shifts; the mock manager code is `2468` (a fixture, same value as the Django debug code) | `16-pos/` |
| `procurement-check.ts` | M23 suppliers and purchase orders (T150) | `noor`; merchant, staff, manager | Creates suppliers / POs in mock state | `23-procurement/` |
| `product-editor-ux-check.ts` | «إضافة منتج» schema audit of 2026-10-23: mandatory fields, save feedback, unsaved-change counting | `noor`; merchant | Creates a product | — |
| `reports-check.ts` | M25 reports hub, exports, schedules (T126–T128) | `noor`; merchant, staff | Creates and deletes schedules; export polling takes seconds | `25-reports/` |
| `returns-check.ts` | M24 returns and reverse logistics (T123–T125) | `noor` (+ `shop` gate); merchant, staff | Creates each return fresh through the API, so re-runnable | — |
| `rollup-check.ts` | M43 multi-store rollup (T184–T186) | linked stores (`<slug>.localhost`); merchant, staff | No writes described in the header | `43-stores/` |
| `settings-check.ts` | M34 store settings hub (T085) | `noor`; merchant, staff | Edits settings in mock state | `34-settings/` |
| `sharwa-pay-check.ts` | M40 Sharwa Pay wallet on the platform origin `localhost/sharwa-pay` (T181–T183) | `localhost`, `console`, `noor` | Mutates the platform's Sharwa Pay rows (a new top-up, a withdrawal and their decisions) | `40-sharwa-pay/` |
| `sharwa-ship-check.ts` | M39 Sharwa Ship (T178–T180) | `noor`; merchant, staff, manager | Mutates `noor`'s Sharwa Ship fixtures (rows picked dynamically); restart for a pristine seed | `39-sharwa-ship/` |
| `shipping-check.ts` | M15 shipping, zones, couriers (T108–T110) | `noor` (+ `shop`); merchant, staff | Mock state is stateful across runs, so one-shot resolutions pick whatever row is still eligible | — |
| `staff-check.ts` | M18 staff, roles, permissions (T111–T113) | `noor`, `shop`; merchant, staff | Creates fresh rows every run; the decision-consuming assertions call the approvals mock in-process (`src/mocks/approvals/state`) | — |
| `storefront-check.ts` | M09 · M10 · M11 · M12 · M41 · M44 buyer journey (T095) | `noor` (luxury_boutique) with `shop` (modern_trust) as isolation control; merchant | Places an order; OTP dialog accepts the **mock** code `123456` | — |
| `tenant-shell-check.ts` | M47 tenant guard + M03 shell: cache isolation, no tenant id in URLs, provisioning redirect, session gate, shortcuts | `noor` + a pending store; cookie `sharwa_mock_session=merchant`; **default port 3100** | No writes described in the header | — |
| `theme-check.ts` | M08 theme customizer (T100/T101) | `noor`, `shop`; merchant, staff | Restores `noor`'s theme and sections at the end | — |
| `wallets-check.ts` | M35 customer wallets and loyalty points | `noor` by default (second argument = store slug); merchant, staff | Creates a wallet and transactions — pass a fresh store slug to re-run without restarting | — |

Scripts that need extra care:

- **`b2b-check.ts` — `requireMocks()`.** Before anything else it probes `/api/bff/products?page_size=1` and `/api/bff/b2b/options` and requires the header `x-sharwa-mock: 1`. If either is live it prints which module is live and exits 1 with: restart the server without them, "e.g. in cmd: `set SHARWA_LIVE_MODULES=&& npm run dev`", or remove `products` / `b2b` from `SHARWA_LIVE_MODULES` in `.env.local`. The other scripts have no such guard: against a live module they fail later, "far from the cause", with 401/503.
- **`pos-check.ts` and `storefront-check.ts`** type codes that look like the Django debug codes (`2468` POS manager code, `123456` checkout OTP). Here they are **mock fixture values**, accepted by the mock BFF; the Django equivalents work only while `DEBUG=True` ([`../management-commands.md`](../management-commands.md#debug-codes)).
- **`staff-check.ts`** calls the approvals mock in-process (`../src/mocks/approvals/state`) for the decision-consuming assertions, because those rows would otherwise be one-shot.
- **`tenant-shell-check.ts`** uses base port **3100**, not 3000.

<a id="caret"></a>

## 6. Hydration note — `caret: "initial"`

`bundles-check.ts` takes every screenshot with `caret: "initial"`. Playwright's default (`"hide"`) writes `caret-color: transparent` **inline** on the focused element, which makes React warn about a hydration mismatch on that style; the caret is irrelevant to the images, so the DOM is left untouched. Use the same option in any new script that screenshots a focused input and asserts "no hydration warning".

<a id="live-run"></a>

## 7. Switching a module to Django and verifying it

The full runbook, with per-module preconditions, is [`../runbooks/switch-module-live.md`](../runbooks/switch-module-live.md) (DOC-460); the variable semantics are in [`../environment.md`](../environment.md#live-modules). This section only shows where the QA gates and scripts fit into it.

1. **Backend up**: Django running with its own `.env`, shared and tenant migrations applied, a test store whose owner can log in with a real password (the `sharwa_mock_session` cookie does not work against Django).
2. **Switch**: in `.env.local` keep `SHARWA_MOCKS=on` and put the module's key in `SHARWA_LIVE_MODULES` (for example `orders`); restart `next dev` — this also resets every mock.
3. **Smoke test through the real login**: open the screens of that module, create / edit / delete one record, reload.
4. **Prove it is Django**: in the browser's network panel, the module's `/api/bff/…` responses must **not** carry `x-sharwa-mock`. A mock response always carries `x-sharwa-mock: 1`.
5. **Gates**: `npm run lint`, `rm -rf .next/types && npx tsc --noEmit`, and the module's `npx tsx scripts/openapi-contract-diff.ts --module <m>`.
6. **Regression of the others**: restart with `SHARWA_LIVE_MODULES=none` and run the mock scripts of the neighbouring modules; the script of the module just switched cannot run live (it logs in with the mock cookie).
7. **Roll back** by removing the key and restarting. Data written live is not visible in mock mode ([`../deployment/rollback.md`](../deployment/rollback.md), planned DOC-518).

## 8. Discrepancies

> ⚠️ Discrepancy — roadmap says `expenses-check.ts` uses a per-run `RUN` tag for idempotent re-runs / code has no `RUN` constant in `expenses-check.ts`. The `RUN` tag (`Date.now().toString(36)…`) exists in `marketing-check.ts` (and in `tenant-isolation-check.ts` for its generated store names). `expenses-check.ts` sends its writes to the `glow` store and relies on mock state being per server process.

> ⚠️ Discrepancy — roadmap says mock scripts are run with `SHARWA_LIVE_MODULES=none` / `b2b-check.ts` tells the operator to use `set SHARWA_LIVE_MODULES=&& npm run dev` (empty). Both work, for different reasons: an empty value means no module live, and `none` is an unknown word that matches nothing. Neither is a "mode".

> ⚠️ Discrepancy — roadmap says the mandatory gates are `npm run lint` and `npx tsc --noEmit` / the README adds `rm -rf .next/types` before `tsc` and three more audits (`rtl-audit`, `anti-ai-audit`, `needs-backend-inventory --check`). This page lists all five.

## 9. Related pages

- [`ci.md`](ci.md) — how these gates could run on every push
- [`django-suites.md`](django-suites.md) — the backend suites
- [`../environment.md`](../environment.md) — `SHARWA_MOCKS`, `SHARWA_LIVE_MODULES`, `SHARWA_CHROMIUM`
- [`../runbooks/switch-module-live.md`](../runbooks/switch-module-live.md) — the switch-live runbook
- [`../../architecture/02-integration-protocol.md`](../../architecture/02-integration-protocol.md) — the four-step protocol
- [`README.md`](README.md) — testing index
