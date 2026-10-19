# Execution log — Phase 6 · US4 platform-owner console: M20 · M45 · M46 (T135–T141)

**Date:** 2026-10-19 · **Branch:** `main` · **Base:** your local Phase 5 commits (not on GitHub yet; see «Push» below) · **Status:** T136–T141 done on mocks (`x-sharwa-mock: 1`). T135 skipped, like the Phase 5 tags (the owner keeps a linear history with no tags). Gates: `npm run lint` ✅ (0 problems) · `npx tsc --noEmit` ✅ · console checks `admin-shell` 23 · `admin-stores` 35 · `admin-billing` 53 · `admin-money` 58 ✅ (two serial runs on a freshly restarted server, 0 console errors) · regressions phase5-decisions 24 · tenant-shell 9 · settings 23 · catalog-orders 22 · storefront 41 · onboarding 33 ✅. Backend untouched. No git run from the session.

## Where it lives

- **Host.** `console.<base>` (on dev: `console.localhost:3000`). The proxy already rewrote that host to `/_a/*`; `src/app/(admin)/%5Fa/` is the new route group. The marketing, store and custom hosts get 404 on `/_a` and on the console BFF (FR-20.01).
- **Login.** `/login`, with users `admin` (superuser: everything) and `ops` (operator: reads everything, writes dues and Sharwa Pay only — FR-20.09). The password is the same as every other mocked login. The dev session cookie is `sharwa_mock_admin=superuser|operator`, a different name from the merchant cookie, so one can never open the other.
- **API.** One catch-all adapter, `src/app/api/bff/platform/[...path]/route.ts`, maps to `/api/v1/platform/*`; `src/mocks/platform/router.ts` serves every row of the three §7 tables. It became a single file for two reasons: the device bridge cannot write more than 7 folders deep, and a passthrough is one file whenever Django ships the rows.

## Screens

| Task | Routes |
|---|---|
| T137 shell | `/login`, `/` overview: Mono number strip (stores, sales as sent, orders; failed and stalled link to the filtered list), queues awaiting a decision, last 50 stores. Sidebar with live counters, ⌘K store search by name/schema/phone/domain (FR-20.08), `G S` / `G D`, dark mode, «Django admin» footer link |
| T138 M20 stores | `/stores`: status (+ `stalled`) / plan / active / q filters in the URL; bulk re-provision with a per-store report; bulk feature override. `/stores/[schema]`: re-provision; Sharwa Ship on/off with a live «قيد التفعيل»; tabs for subscription, domains (add / make primary), features (39 keys, inherited vs override on/off + notes, decided-by step), apps, deactivation (suspend → deactivate → close, reinstate; disallowed steps disabled with the server's reason), action log. `/webhook-events` (retry/discard; a deleted store can only be discarded) |
| T139 M46 | `/plans` (+ sheet editor; delete → 409 with the subscription count), `/plans/matrix` (optimistic toggles with rollback), `/features` (kill switch + requires_plan with impact dialogs), `/features/overrides` (bulk editor), `/subscriptions` (assign plan, history kept), `/billing-settings` (the two master switches + the FR-46.04 order + «افحص متجراً»), `/apps` (+ billing overrides), `/market-categories` (rename, toggle, ↑/↓ order) |
| T140 M45 + Sharwa Pay + zones | `/dues` (`q`/`period` in the URL, wallet per currency or «لا محفظة»), `/dues/[schema]` (four sections + installed apps, the 8 FR-45.03 actions, each through a confirmation, server sentences verbatim, 409 refreshes), `/sharwa-pay/topups` (receipt panel, duplicate transfer → link to the earlier request, A/R), `/sharwa-pay/withdrawals` («مخصوم مسبقاً», reject returns the amount), `/wallets/[phone]`, `/sharwa-ship/zones` (CRUD + an SVG map, no tiles) |

## One source of truth (the platform state feeds the merchant side)

`src/mocks/platform/state.ts` holds the public-schema rows and implements the FR-46.04 resolution order once (`resolveFeature`).

- **Merchant session (M03).** Its `features[]` now come from that state through `effectiveFeatures()`. An override, kill switch or plan gate set in the console changes the merchant's sidebar immediately (SC-20.4). The checks prove it on `glow`, `noor` and `zahra`, and restore every flag they touch.
- **M15 «شروة شيب».** It now reads the console's zones.
- **M02 wizard.** Its market categories are the console's rows (active only, in the console's order).
- **Fixture stores.** `noor`, `shop`, `pending1` and `closed` carry no override, so they keep all 39 features exactly as before.

## Build

Foundation first (T136/T137, main session), then three isolated builds (T138, T139, T140) that created files only. One shared patch was merged: the server-side `?plan=` filter on subscriptions.

A real bug fix came out of the merge run: at 390px the overview's sales figure overflowed and the search box covered the menu button. The sales figure now spans both columns and steps down a size.

## Gates

```
$ npm run lint                                   → 0 problems
$ rm -rf .next/types && npx tsc --noEmit         → exit 0
$ SHARWA_CHROMIUM=… npx tsx scripts/<name>-check.ts 3300   (serial, fresh server)
admin-shell 23 ✓ · admin-stores 35 ✓ · admin-billing 53 ✓ · admin-money 58 ✓ (0 console errors)
phase5-decisions 24 ✓ · tenant-shell 9 ✓ · settings 23 ✓ · catalog-orders 22 ✓ · storefront 41 ✓ · onboarding 33 ✓
(storefront: one run logged a one-off service-worker hydration warning on the PWA second visit; an immediate rerun was clean. No Phase 6 code touches the storefront.)
```

Visual checks: `docs/visual-checks/20-admin/` (overview, stores, store features, override, deactivation dialog, webhook events, Sharwa Pay, zones, operator read-only, login), `45-dues/`, `46-plans/` — desktop / tablet / mobile / desktop-dark, 0 horizontal scroll at 390px, mobile targets ≥ 44px.

The checks change state. They consume seeded pending top-ups, withdrawals and noor commissions, and skip those steps once the queues are empty. They restore every global flag they touch. A dev-server restart resets everything.

## Deviations

See the Phase 6 table in `tasks.md`.

## Owner decisions still open

1. **Admin auth contract.** Until Django exposes a session contract for `/api/v1/platform/*`, the console works only with mocks on. Please add a staff/superuser session + CSRF on the public schema (M20 §7), and name the operator group, e.g. Django staff without superuser.
2. **Custody settlement.** The mock treats custody as settled when the store has no pending dues and a zero Sharwa Pay balance, and `close` is blocked otherwise. Confirm this is the backend's rule, or name the field that marks `settled_custody`.
3. **Reinstate.** The spec lists suspend → deactivate → close. I added «إعادة التفعيل» from suspended/deactivated (never from closed), because a suspension that cannot be lifted is a dead end. Keep it?
4. **Suspended stores on the storefront.** A suspended store is marked `is_active=false` in the console, but the storefront probe fixtures (M47) were not wired to it. With the real backend that is automatic. Nothing to do unless you want the mock wired too.

---

# Execution log — Phase 5 · owner decisions (2026-10-19)

**Date:** 2026-10-19 · **Branch:** `main` · **Base:** the Phase 5 working tree (not yet committed) · **Status:** the seven open Phase 5 items are decided (the owner delegated all of them) and applied on mocks. Gates: `npm run lint` ✅ (0 problems) · `npx next typegen && npx tsc --noEmit` ✅ · new `scripts/phase5-decisions-check.ts` 24 ✓ (two runs in a row, 0 console errors) · passthrough replace-by-key unit check ✅ · regressions `tenant-shell` 9 · `settings` 23 · `catalog-orders` 22 · `storefront` 41 · `onboarding` 33 ✅. Backend untouched. No git run from the session.

## Decisions

| # | Item | Decision | Why |
|---|---|---|---|
| 1 | Owner-only screens without a permission key | **Stay owner-only. No new keys in `src/lib/access.ts`.** Sidebar and ⌘K **hide** them for staff (not disabled). The BFF keeps answering 403. One helper `isStoreOwner()` + `ownerOnly` on 25 nav items. | The 35 keys are Django's. A key the backend never grants can only ever say no. A disabled entry with «اطلب الصلاحية» is a dead end when no manager can grant it. When Django adds a key such as `settings.manage`, only the `ownerOnly` flags change. |
| 2 | Demo fixtures | **Added a «مدير المتجر» session** (`sharwa_mock_session=manager`, login phone `967770000004`, staff #4 منى القحطاني, location 3). It has the full plan (39 features) and 27 manager keys. It does not have `orders.delete`, `staff.manage_roles`, `support.takeover_session` or `suppliers.approve`. The cashier stays as it was. | Plan features are store-wide, so staff screenshots can now show «forbidden» and «owner-only» rather than «feature off». Using an existing seeded member keeps self-approval and audit actors consistent. |
| 3 | M19 `www.` | **Allowed.** Any label is now accepted on the merchant's own domain. The platform namespace `*.<base>` stays refused. `www.` gets a CNAME and the apex an A record (unchanged). | The reserved labels (www/api/admin/app) protect the platform's subdomains. `www.brand.com` is the most common storefront address. |
| 4 | M25 contradictions | **No code change.** (a) 6 `not_yet_available` + `whatsapp_costs` as `coming_soon` = 7 disabled. Both counts hold, and «قريباً» differs from «غير متاح بعد». (b) Category keys are kept on top of `reports.view`. | Least privilege: sales, profit, inventory, customers and staff performance are separate keys in the backend exactly so a member can open the module without seeing margins. The manager fixture shows it: sales 200, profit 403. |
| 5 | Two editing surfaces for Sharwa Pay / manual | **One: `/dashboard/payments`.** Settings → الدفع is now a read-only summary with «إدارة وسائل الدفع». ⌘K «إعداد: شروة باي / الدفع اليدوي» opens `/dashboard/payments` (new `managedAt` on `SectionMeta`). Staff no longer get those ⌘K entries. | The toggles depend on gateways and payout accounts, and «manual on with no active account» can only be caught there. Two forms on one row invite conflicting edits. `PATCH /settings/payments/` is now unused (README). |
| 6 | Checkout delivery methods | **The M15 shipping state is the single source.** Checkout options, quote and order creation (M12), the tracking pickup (M41), M06 order detail, «تحويل إلى استلام» and the manual-order form options all read `checkoutDeliveryMethods` / `checkoutPickups` / `findPickup`. Prices are YER_NEW decimals, converted server-side. `METHOD_FEE_SAR` is gone. | A method the merchant adds or disables shows, or disappears, at checkout immediately. Inactive pickups are not offered but still name old orders. |
| 7 | Passthrough registry | **Replace by key.** A `Map` keyed by exact path or `/source/flags`, with the first registration's position kept as the match order. | A hot-reloaded `/api/v1` fixture replaces its handler instead of hiding behind the stale one. |

## Files

- `src/lib/access.ts` — `isStoreOwner()` + the owner-only policy note.
- `src/features/dashboard-shell/{navigation.ts,components/session-context.tsx,components/sidebar.tsx}` — `ownerOnly` on `NavItem`, `canOwnerOnly()`, hidden for staff.
- `src/features/command-palette/{palette-index.ts,command-palette.tsx}` — same filter; `managedAt` paths.
- `src/mocks/dashboard/{auth.ts,me.ts}` — `manager` session kind and fixture.
- `src/features/integrations/schemas.ts` — reserved-label rule removed from `domainFormatError` (`RESERVED_LABELS` deleted, it had no other user).
- `src/features/settings/{schemas.ts,components/explicit-sections.tsx}` — `managedAt`; `PaymentsSummary` replaces `PaymentsForm`.
- `src/mocks/shipping/state.ts` — the read model (`checkoutDeliveryMethods`, `checkoutPickups`, `findPickup`).
- `src/mocks/storefront/{checkout.ts,tracking.ts}`, `src/mocks/orders/state.ts`, `src/app/api/bff/orders/form-options/route.ts` — read the read model.
- `src/mocks/passthrough.ts` — keyed registry.
- `scripts/phase5-decisions-check.ts` (new), `src/app/api/bff/README.md`, `specs/001-sharwa-frontend-platform/tasks.md`.

## Verification notes

- This session's shell on the device was down, so the work ran on a copy: the GitHub Phase 4 tree with every Phase 5 file overlaid. The device file bridge cannot reach files more than 7 folders deep, which covers 81 dashboard `page.tsx`/`layout.tsx` wrappers and 23 deep BFF routes (e.g. `shipping/carriers/[code]/test`). None of them were edited. Thin stand-in pages were used only inside the copy for the browser runs and were not written back.
- For that reason `shipping`, `payments` and `domains` were run here only up to the first deep route they call: everything before it passed, and the stop is a missing file in the copy. **Run the full Phase 5 suite once on your machine** (commands in the hand-off message). `staff`, `customers`, `theme`, `marketing`, `inventory`, `locations`, `returns`, `reports`, `wallets` and `engagement` were not touched by these decisions.
- Fees seen at checkout now follow M15 prices (2500 / 1500 YER_NEW converted at the store's rate) instead of the old 25 / 15 SAR constants. Totals change accordingly; no check asserted the old amounts.

## Backend notes (for `C:\sharwa_saas`, read-only from here)

- Owner-only areas: if staff delegation is wanted later, add keys such as `settings.manage`, `payments.manage`, `shipping.manage` and `storefront.design` to the permission catalog. The frontend then swaps `ownerOnly` for `permission`.
- Payments: keep ONE write endpoint for `enable_sharwa_pay` / `enable_manual_payment` (proposed `PATCH /store/payments/`); drop the M34 `PATCH /settings/payments/` proposal.

---

# Execution log — Phase 5 · US3 daily management: M07 · M08 · M13 · M14 · M15 · M18 · M19 · M21 · M22 · M24 · M25 · M35 · M42 (T096–T134)

**Date:** 2026-10-18 · **Branch:** `main` · **Base:** the Phase 4 commit · **Status:** T096–T134 done on mocks (`x-sharwa-mock: 1`). Gates: `npm run lint` ✅ (0 errors, 0 warnings) · `npx tsc --noEmit` ✅ · 13 module functional checks ✅ · visual checks in 13 folders ✅ · regressions `tenant-shell` 9 · `catalog-orders` 22 · `settings` 23 · `onboarding` 33 · `storefront` 41 ✅. Backend untouched (`C:\sharwa_saas` not opened this phase). No git run from the session.

## How it was built

Shared foundations first (main session), then one isolated build per module, merged by the main session:

- `src/mocks/locations/state.ts` — 7 seeded locations (warehouse, two branches, PUDO, van, dropship, inactive 3PL), 8 flags, assignments, routing rules.
- `src/mocks/approvals/state.ts` — the approvals queue shared by M18 (resolve) and M21 (write-off requests): 409 on stale `version`, 403 on self-approval, note required on reject.
- `src/mocks/loyalty/program.ts`, `src/mocks/wallets/state.ts`, `src/mocks/inventory/state.ts` — programme, customer wallets/points with idempotent transactions, per-location stock with a movement ledger.
- `src/components/shared/access-gate.tsx` — `AccessGate` / `FeatureOffState` / `ForbiddenState` for the five states (FR-011).

## Screens per module

| Module | Tasks | Routes |
|---|---|---|
| M07 العملاء | T096–T098 | `/dashboard/customers` (segments, trust, wallet/points, export with 429), `/customers/[phone]` (6 tabs, COD trust split platform/store, notes) |
| M08 مخصّص الثيم | T099–T101 | `/dashboard/design` (presets, colours with contrast warning, fonts, sections drag, announcement; live iframe preview via `postMessage`; publish separate), `/design/sections/[id]` |
| M13 التسويق | T102–T104 | `/dashboard/marketing` hub, `coupons`, `offers`, `abandoned-carts` (+settings), `campaigns`, `timeline`, `loyalty`, `gifting`; `/bar` → settings announcement |
| M14 الدفع والمحفظة | T105–T107 | `/dashboard/payments` (gateways, Sharwa Pay/manual), `/payments/gateways/[code]`, `/payments/payout-accounts`, `/dashboard/wallet` (4 currencies, no total), `/wallet/withdrawals(/new)`, `/wallet/dues` |
| M15 الشحن | T108–T110 | `/dashboard/shipping` (fees + methods), `pickup-locations`, `providers`, `carriers(/[code])`, `zones`, `packaging`, `zone-review`, `edge-cases` |
| M18 الموظفون | T111–T113 | `/dashboard/staff(/[id])`, `staff/roles(/new,/[id])`, `staff/approvals`, `staff/audit-log`, `staff/alerts` |
| M19 النطاقات والربط | T114–T116 | `/dashboard/settings/{domains,webhooks,webhooks/[id],integrations}`, `/dashboard/marketing/tracking` |
| M21 المخزون | T117–T119 | `/dashboard/inventory` (inline adjust), `movements`, `items`, `reservations`, `writeoffs` |
| M22 المواقع | T120–T122 | `/dashboard/locations` (mode switch, list), `new`, `[id]` (data/inventory/staff tabs), `routing` |
| M24 المرتجعات | T123–T125 | `/dashboard/returns(/new,/[id])`, `returns/rma(/[id],/scan)`, `returns/refunds-log` |
| M25 التقارير | T126–T128 | `/dashboard/reports` (10 categories), `reports/[code]` (compare, chart, export jobs), `reports/exports`, `reports/scheduled` |
| M35 محافظ العملاء | T129–T131 | `/dashboard/customers/wallets(/new,/[id])`, `/dashboard/customers/points` |
| M42 الأمنيات والتقييمات | T132–T134 | storefront wishlist on the server by shopper phone, `/wishlist`, product reviews with rating filter (OTP kept), back-in-stock, store reviews on `/about` |

## Merge step (main session)

- `navigation.ts`: new `marketing.hub`, `customers.points`, `wallet.withdrawals`, `wallet.dues`, `tools.domains`, `tools.webhooks`, `tools.integrations`; paths updated for design, coupons/offers, staff alerts, the shipping group, payments, returns/RMA and the refunds log.
- `SettingsShell`: a «الربط والتكاملات» group (domains, webhooks, integrations, tracking); owner-only items hidden from staff.
- Sidebar counters `pending_approvals` and `unread_behavior_alerts` now read the live M18 queue and alerts.
- M13 campaign audience = M07 segment count; ⌘K customer results open `/dashboard/customers/<phone>`.
- Approval / movement links to purchase orders unified on `/dashboard/suppliers/purchase-orders/<id>` (suppliers module comes later); M21's approvals links fixed to `/dashboard/staff/approvals`.
- M06 refund dialog links to `/dashboard/returns/new?order=<id>`.
- `CheckoutScreen` renders its skeleton until hydration is complete — the regression run caught a hydration mismatch when the cart query resolved through another subscriber before the checkout Suspense boundary hydrated.
- `scripts/marketing-check.ts` waits for the URL state instead of reading it on the first render (one flaky assertion).
- Wallet forms use `useWatch` (React Compiler warnings cleared).
- `src/app/api/bff/README.md`: rows for every Phase 5 adapter.

## Gates

```
$ npm run lint      → 0 problems
$ rm -rf .next/types && npx tsc --noEmit → exit 0
$ SHARWA_CHROMIUM=/opt/pw-browsers/chromium npx tsx scripts/<name>-check.ts 3300   (one serial run, fresh dev server)
tenant-shell 9 ✓ · catalog-orders 22 ✓ · settings 23 ✓ · onboarding 33 ✓ · storefront 41 ✓ (0 console errors)
customers 27 ✓ · theme 26 ✓ · marketing 30 ✓ · payments 40 ✓ · shipping 29 ✓ · staff 22 ✓ · domains 34 ✓
inventory 27 ✓ · locations 25 ✓ · returns 30 ✓ · reports 41 ✓ · wallets 26 ✓ · engagement 28 ✓
```

Visual checks: `docs/visual-checks/{07-customers,08-theme,13-marketing,14-payments,15-shipping,18-staff,19-domains,21-inventory,22-locations,24-returns,25-reports,35-wallets,42-engagement}/` — desktop, tablet, mobile, desktop-dark per main screen plus the empty (`shop`), forbidden/feature-off (staff) and sheet/dialog states; 0 console errors, 0 horizontal scroll, every mobile target ≥ 44px.

Note: the mocks keep state in the dev server's memory; check runs add rows (test coupons, campaigns, notes…). A dev-server restart resets them.

## Deviations

See the Phase 5 table in `tasks.md`.

## Owner decisions still open

All seven answered on 2026-10-19 (delegated by the owner) — see «Phase 5 · owner decisions» at the top. Original wording kept below for the record.

1. **Owner-only screens without a permission key** (locations, design, domains, webhooks, payments, shipping settings): the BFF enforces `kind === "merchant"`. Should staff managers get keys (a change to `src/lib/access.ts`), and should the sidebar hide these entries for staff?
2. **Demo fixtures:** the cashier's plan lacks `multi_location`, `staff_rbac`, `reports` and `customer_wallets`, so staff screenshots show "feature off" rather than "forbidden". Add a manager fixture with these features?
3. **M19 `www.`:** custom domains starting with `www.` are rejected (reserved list in the brief). Allow them?
4. **M25 spec contradictions:** 6 vs 7 unavailable reports (`whatsapp_costs` set to «قريباً»), and core reports requiring a category key besides `reports.view`.
5. **Two editing surfaces:** Sharwa Pay / manual payment are editable from both `/dashboard/payments` and `/dashboard/settings/payments`; keep both?
6. **Checkout delivery methods:** the M12 checkout mock still reads its own constants, so methods added in M15 do not show at checkout yet — unify the mocks.
7. **Passthrough registry:** `src/mocks/passthrough.ts` only appends, so a hot-reloaded `/api/v1` fixture keeps its first version until the dev server restarts. Replace-by-key would fix it.

---

# Execution log — Phase 4 · US2 storefront: M09 · M10 · M11 · M12 · M41 · M44 (T086–T095)

**Date:** 2026-10-18 · **Branch:** `main` · **Base:** the 3E commit · **Status:** T087–T094 done. T095 gates: `npm run lint` ✅ · `npx tsc --noEmit` ✅ · `scripts/storefront-check.ts` **41/41** ✅ · visual check **72 screenshots** across the six folders (0 console errors, 0 horizontal scroll, every mobile target ≥ 44px) ✅ · regressions `tenant-shell-check` 9 ✅ · `settings-check` 23 ✅ · `catalog-orders-check` 22 ✅ · `next build` ✅. **T095 closed** after the owner-approved lazy split (`next/dynamic`): PDP mobile performance median **91** (see T095). Backend untouched (`C:\sharwa_saas` was read only, for `theme_presets.py`, `cart.py` and `constants.py`). Mocks only (`x-sharwa-mock: 1`).

## Delivery (read first)

- Per the linear workflow, every file is written straight into the project. There are no `.handoff` patches and no git from this session. The commit commands are at the end of the hand-off message.
- T086 (`rp/07-storefront-before`) was not created, because the workflow has no tags.
- **Restart `next dev` once** after pulling. The mock catalogue seed changed (see T090), and the in-memory mock state only reseeds on start.

## T087 — Ready schemas, cached reads, passthrough mocks

- Schemas live in `src/features/storefront/schemas/{config,catalog,cart}.ts` (ready-api-v1 #1–#7), with the extensions marked optional:
  - `readSection()` normalises the 8 section types. An unknown type is dropped with a `console.warn`, so a new Django section never breaks the home page.
  - `lineKey()` mirrors Django `_get_key`.
- Cached server reads are in `src/features/storefront/api/{config,catalog}.ts`. Each one is `'use cache'` + `cacheLife('minutes')` + `cacheTag(storeTag(store))`, with `store` as the first argument and no cookies. They throw on upstream failure, so a failure is never cached. A page past the end comes back as a 404 *result*, so the listing can redirect to the last page.
- Passthrough fixtures are in `src/mocks/storefront/passthrough.ts`: `config/`, `catalog/{categories,products,products/<id>}/`, `cart/` (+ `?currency=`), `cart/actions/`, `pwa/install-event/` (30/min) and `push/{vapid-public-key,subscribe,unsubscribe}/`. The mock cart is keyed by the dev-only cookie `sharwa_mock_cart`.
- `storefrontAdapter()` (`src/lib/bff/storefront-adapter.ts`) serves every new `/api/bff/*` storefront row. It tries the documented `/api/v1` target first, falls back to the mock only on 404/405/501 or when the target is unreachable, and returns 501 when mocks are off. The dashboard `mockRoute` now calls `revalidateTag(storeTag(store), {expire: 0})` after a successful write.

## T088 — Theme engine

- `presets.ts`: the 9 presets copied from Django `theme_presets.py` (keys, Arabic names, hex values, fonts, `design_style`), plus `STORE_FONTS` (11) and `DESIGN_STYLES`.
- `tokens.ts` `buildStoreTheme()`:
  - It derives `--background … --ring`, `--brand-50…900`, `--store-link`, semantic colours, `--radius`, `--store-bw` and density.
  - Ink is `#09090B` or `#FAFAFA`, chosen by contrast. `--muted-foreground` is lifted to AA against `--muted`, the stricter of the two surfaces it sits on.
  - An invalid colour or an incomplete `brand_shades` falls back to zinc.
- `apply-theme.tsx`: the variables go inline on the `[data-store-theme]` root and in a hoisted `<style precedence>` on `body`, so portals (sheet, dialog, drawer) inherit them. The `dark:` variant is excluded on store pages.
- `fonts.ts`: 10 `next/font/local` families (Arabic subset, 400/700, `preload: false`). The eleventh is the platform's IBM Plex. A store fetches only what its theme names: `storefront-check` sees `cairo, amiri` on noor.

## T089 — Home, chrome, listings

- **Home** renders the merchant's sections by `order`: hero, category strip, featured, latest, slider, banner grid, product grid and offers. The inactive section leaves no gap, and `show_on_mobile=false` is `hidden md:block`. An empty store gets a notice, and the page carries Store JSON-LD.
- **Chrome:**
  - An announcement line, with speeds, a static mode and pause on hover, shown according to the page-kind flags.
  - A header with logo or name, search, currency, wishlist and cart.
  - On phones, a 5-item bottom bar (≥ 44px each) that steps aside on checkout.
  - A footer and a WhatsApp button.
- **Search:** header suggestions with an AbortController and a `/` shortcut. Zero-result searches are logged locally.
- **Listings** (`c/[id]`, `products`, `search`):
  - nuqs facets with `shallow:false`, so the URL is the shareable state.
  - Server pagination; a page past the end redirects to the last page.
  - On phones, a filters drawer with a live «عرض N منتجاً» count.
  - A breadcrumb and a hidden `h2` so the cards' `h3` keep the heading order.

## T090 — PDP

- **Gallery:** `next/image` at fixed ratios; the first image is `priority`. Choosing a variant brings its image into view.
- **Buy box:**
  - **Options:**
    - `sizes_list`/`colors_list` (Ready), then `attributes`/`variants` from the mock.
    - Unavailable options stay visible: struck through and `aria-disabled`.
    - A missing required option focuses its group and shows «اختر المقاس أولاً.».
  - **Price and quantity:**
    - Quantity is clamped to stock.
    - The `?v=&qty=` URL state is shareable.
    - Deposit products show «المطلوب الآن / المستحق عند الاستلام».
  - **Actions:**
    - «أضف إلى السلة» opens the cart.
    - «اشترِ الآن» goes to `/checkout?mode=buy_now…`.
    - A sticky bar on phones.
  - **Extras:** delivery info, wishlist, share, and «نبّهني عند التوفر».
- Each special block renders only when its data exists, with the server's amounts:
  - tier table
  - formula quote
  - bundle parts
  - 9 personalization field types
  - auction (server-clock skew, anti-sniping)
  - booking days and slots
- Reviews (pending moderation after posting) and related rows.
- Product and BreadcrumbList JSON-LD, plus `generateMetadata`. An unknown or unsold product shows «هذا المنتج غير متاح» (404).
- **Seed tweaks** (`src/mocks/catalog/seed.ts`): «خاتم فضة» is now published (personalization), and «دهن عود كمبودي» is a `landing_page` template with a 100 deposit.

## T091 — Cart

- One TanStack key, `['store', store, 'cart']`. Updates are optimistic, run in series through a mutation scope, roll back on error, and offer a retry toast.
- On desktop the cart is a `Sheet` at the start side (RTL); on phones it is a 92dvh drawer. There is also a full `/cart` page.
- The panel shows lines with `display_*`, + / − / remove, and «إفراغ».
- **Coupons:** the server's error text is shown as is (`OLD20` → «انتهت صلاحية هذا الكوبون»; `WELCOME10` applies).
- **Offers and shipping:** «البخور 3 بـ 2», and a free-shipping progress bar.
- **Abandoned cart:** one phone capture per store (`cart/contact`), and `?restore=` links.

## T092 — Checkout

- One page, built on RHF + Zod `CheckoutDraft`:
  - **Contact:** contact details.
  - **Fulfilment:** delivery or pickup tabs, address with geolocation, delivery methods.
  - **Payment:** manual transfer with receipt, Sharwa Pay, Jeeb and COD.
  - **Extras:** wallet, loyalty, gift.
  - **Invoice:** a live invoice from `checkout/quote`, with `keepPreviousData`.
- COD, wallet, Sharwa Pay and loyalty each confirm through a 6-digit OTP dialog. The mock code is `123456`, resend waits 60 s, and 5 wrong tries lock it.
- **Submit:**
  - The submit is `POST /api/bff/checkout` as multipart.
  - It is idempotent on `client_uuid`.
  - A 409 shows what changed and reloads the cart and invoice.
  - Field errors focus their field.
  - `next_action` decides where the buyer goes next: success, the gateway (`/checkout/result?order=`, which polls until the mock gateway settles), or transfer instructions.
- The success page shows the order number, a tracking link, receipt upload and an optional push subscription.
- Orders are stored in SAR with a locked `fx_from_sar` and shown in the display currency. The new order appears in the merchant's `/api/bff/orders`.

## T093 — Tracking (M41)

- `/track/[uuid]` is `noindex`. It shows the rollup, per-fulfilment shipments with an event timeline, pickup codes, a masked phone, the merchant's WhatsApp, a return-policy excerpt, and a 60 s poll while a shipment moves.
- A gift order shows no amounts. An unknown UUID, or another store's, gets the same «لم نجد هذا الطلب» with a 404 status.

## T094 — PWA (M44)

- **Generated assets:** `manifest.webmanifest` comes from the config (`theme_color` = primary, `#D4AF37` on noor). `icon` is generated by `ImageResponse` with local Cairo WOFF.
- **Service worker:** `sw.js` is network-only for cart, config and BFF, network-first for the API, and cache-first for media. It has an offline page and push handlers. `SKIP_WAITING` is deferred while on checkout. It is registered on the store origin only, after `load` + idle.
- **Install prompt:**
  - It never shows on the first visit or on checkout; it needs a second visit or a non-empty cart.
  - Chrome/Android uses `beforeinstallprompt`; iOS gets a one-time steps drawer.
  - A dismissal is respected for 14 days.
  - Events go to `POST /api/v1/pwa/install-event/` with `source: 'nextjs_app'`.

## Fixes made while verifying

- **Currency re-pin race:** the switcher's sync effect re-fetched the cart in the *old* currency while the refresh was still in flight, so the cart flipped back. The effect now waits while a switch is pending.
- **Dev `Date.now()` report:** the layout's uncached probe fetch finished (undici stamps `Date.now()`) inside Next's dev prefetch stage, and Next reported it as sync IO in the route. The storefront layout and `getTracking` now `await connection()`, the same as the dashboard and onboarding groups.
- **`<html id="__next_error__">` on `notFound()`:** React rendered that document on the client and warned «Encountered a script tag» for next-themes' script. A root `ThemeProvider` wrapper (`src/components/providers/theme-provider.tsx`) now makes that script a data block when it is created in the browser.
- **Mobile layout:**
  - `grid-cols-1` on the PDP and checkout grids. The implicit `auto` track grew to the booking rail's content (122px of horizontal scroll).
  - `min-w-0` on storefront fieldsets.
- **Touch targets:** 44px for the header name link, the rating link, «سياسة الاسترجاع» and the checkout fulfilment tabs.
- **File inputs:** a `FileField` replaces the native file input («Choose File · No file chosen» in the browser's locale) on receipts and personalization.
- **Accessible name:** the currency switcher's name now starts with its visible text.
- **`scripts/visual-check.ts`:** a radio or checkbox inside a `<label>` that is ≥ 44px tall is exempt, because the label is the hit area.
- **Turbopack dev cache:** after a temporary debug edit in `node_modules` (reverted), the dev cache caused a reload loop («HMR hash mismatch»). Clearing `.next/dev` fixed it. This is noted only in case it happens on your machine.

## T095 — Gates

```
$ npm run lint      → (no output)
$ npx tsc --noEmit  → exit 0   (rm -rf .next/types first while `next dev` runs)
$ SHARWA_CHROMIUM=… npx tsx scripts/storefront-check.ts 3300
— 1. home
✓ home renders the active sections (37,38,39,40,41,42,43,44,45)
✓ sections follow `order` even though the API lists them out of order
✓ the inactive section (46) is absent
✓ show_on_mobile=false section is visible on desktop
✓ at most two store font families fetched (cairo, amiri)
✓ noor carries its preset (luxury_boutique)
✓ show_on_mobile=false section is hidden under md
✓ mobile tab bar visible under md
✓ shop keeps its own tokens (modern_trust: #4F46E5 ≠ #D4AF37)
✓ dashboard stays zinc (no store theme root, --primary #09090b)
— 2. listing & search
✓ facet writes the URL (brand=2) and narrows (16 منتجاً → 5 منتجاً)
✓ the shared URL reproduces the same result
✓ the facet is checked after reload
✓ page past the end redirects to the last page (page=1)
✓ an impossible search shows the empty state
✓ header search suggests products (3)
— 3. PDP · 4. cart
✓ missing required option blocks the add with «اختر المقاس أولاً.»
✓ nothing reached the cart
✓ the out-of-stock size (M) is disabled
✓ a valid add opens the cart with the line
✓ the cart survives a reload (cookie)
✓ OLD20 shows the server's expiry message
✓ WELCOME10 applies
✓ currency → USD re-prices the cart (207.00 ر.س → 55.20 $)
✓ and back to SAR restores the amount
— 5. checkout
✓ COD + OTP places order #10481
✓ the cart is empty after the order
✓ manual transfer → receipt uploaded on the success page
✓ jeeb redirects to the gateway return URL
✓ the result page reads the settled status from the server («جديد»)
✓ re-POSTing client_uuid returns the same order (#10484 / #10484)
— 6. dashboard · 7. tracking
✓ order #10481 is visible in the merchant's orders
✓ unknown tracking uuid → 404 page
✓ gift order tracking renders
✓ the gift order shows no amounts
— 8. PWA
✓ manifest theme_color = #D4AF37
✓ sw.js served as application/javascript; charset=utf-8
✓ no install hint on the first visit
✓ the iOS hint appears on the second visit
✓ install events sent with source nextjs_app (ios_hint_shown)
✓ never on checkout
storefront-check: all passed
$ … tenant-shell-check 3300   → ✓ 9   · settings-check → ✓ 23 · catalog-orders-check → ✓ 22
$ npx next build               → ✓ (stop `next dev` and remove `.next/dev` first: its types clash with `.next/types`)
```

**Visual checks** (`npm run visual-check`, all passing):

| Folder | Shots |
|---|---|
| `docs/visual-checks/09-storefront-home/` | home (desktop · tablet · mobile · mobile-dark), shop (isolation), category (4 sizes), empty search, filters drawer, categories drawer, about |
| `docs/visual-checks/10-pdp/` | variants PDP (4 sizes), required-missing, bundle, personalization, auction, booking, landing, formula, sold-out, not-found (404) |
| `docs/visual-checks/11-cart/` | full cart (4 sizes), empty, sheet (desktop sheet / phone drawer) |
| `docs/visual-checks/12-checkout/` | checkout (4 sizes), empty, validation, COD OTP dialog, success with manual transfer (4 sizes) |
| `docs/visual-checks/41-tracking/` | tracking (4 sizes), gift, not-found (404) |
| `docs/visual-checks/44-pwa/` | offline, icon, install hint, iOS steps |

Cart states use `--cookie sharwa_mock_cart=<id>` from a cart built with `POST /api/v1/cart/actions/`.

**Lighthouse** (mobile, production build, `next start`, 3 runs each, Lighthouse 12.6):

| Page | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| `/` | 77 · 84 · 91 (one earlier run 97) | 100 | 100 | 100 |
| `/p/1001` | 69 · 87 · 86 (one run 94) | 100 | 100 | 100 |
| `/p/1019` | 72 · 87 · 81 | 100 | 100 | 100 |
| `/c/1` | 81 · 85 · 85 | 98 → `heading-order`, fixed after the run | 100 | 100 |

The **performance target (≥ 90) is not met here**. The scores are Lantern simulations and they swing ±15 on this container's CPU. The *observed* LCP is 0.25–0.5 s and CLS is ≤ 0.04. The simulated LCP (2.9–3.6 s) counts every script that ran before the first paint. The lever is less client JS on the PDP. Please measure on your machine (`npx next build && npx next start`, then `npx lighthouse http://<store>.localhost:3000/p/<id> --form-factor=mobile`) before deciding.

**After the lazy split (owner decision 1, 2026-10-18; 5 runs each, production build):**

| Page | Performance (median, range) | Accessibility · Best practices · SEO |
|---|---|---|
| `/p/1001` | **91** (91–94) | 100 · 100 · 100 |
| `/` | 89 (82–92) | 100 · 100 · 100 |
| `/p/1019` | 86 | 100 · 100 · 100 |
| `/c/1` | 84 | 100 · 100 · 100 |

What moved: reviews and related rows load through `next/dynamic` and mount only within 240px of the viewport (`BelowTheFold`); the buy-box variants (auction, booking, tiers, formula, bundle, personalisation) are dynamic and mount only when the product has that data; the cart sheet, categories drawer, gallery zoom, currency menu, install prompt, service-worker registration and push subscribe mount on first use; `Breadcrumb` left the listing module; store headings are bold-only so the Amiri 400 file is never fetched.

## Deviations

See the Phase 4 table in `tasks.md`. In short:

- T086 has no tag.
- Fonts are vendored (R-07).
- No dark mode on store pages.
- The currency preference is a cookie plus `?currency=` when it is present.
- The wishlist is local.
- The seed was tweaked.
- Orders are stored in SAR with a locked rate.
- Geolocation only, no map.
- `customers/otp/send` is a proposed endpoint.
- Tracking is at `/track/[uuid]`.
- There is no merchant test push.
- T095 closed with the PDP at a median of 91 after the lazy split.

## Owner decisions still open

Answered by the owner on 2026-10-18:

1. **PDP performance:** yes to `next/dynamic` below the fold — applied, T095 closed.
2. **`customers/otp/send`:** confirmed as the standard BFF endpoint for buyer OTP outside checkout.
3. **Currency in the URL:** no — the cookie alone carries it (better for UX and SEO).

---

# Execution log — Phase 3E · M34 Store settings hub (T082–T085)

**Date:** 2026-10-18 · **Branch:** `main` · **Base:** the 3D tree (see «Delivery» below) · **Status:** T083–T084 done; T085 gates pass — `npm run lint` ✅ · `npx tsc --noEmit` ✅ · `scripts/settings-check.ts` **22/22** ✅ · `scripts/catalog-orders-check.ts` (3D regression) **21/21** ✅ · visual check **41 screenshots**, 0 console errors, 0 horizontal scroll, every mobile target ≥ 44px. Backend untouched. Mocks only (`x-sharwa-mock: 1`).

## Delivery (read first)

- Your commit `feat(phase-3d)…` exists, but the 3D **source was not in the working tree**: `src/features/` held only `dashboard-shell`, `landing`, `onboarding`, `tenant`, and `execution_log.md` was the 3C one. The `.handoff` patches had been committed as files, not applied. `origin` (GitHub) was still empty.
- This session has no shell on your machine, and attaching the repository for push was refused, so the `git add / commit / push` step of the new linear workflow is yours. Per the new rule, **no `.handoff`**: every 3D and 3E file was written straight into the project folder.
- T082's tag `rp/08-settings-before` was not created (no git here; the new workflow has no tags).

## T083 — Schemas, mocks, BFF

- `src/features/settings/schemas.ts`: the `StoreSetting` read model, with the fields of the seven Django forms only (FR-34.02). No `admin_password`, and no logo, colours or fonts (those belong to M08). FX defaults are `usd_to_sar 3.75`, `sar_to_yer_old 140` and `sar_to_yer_new 520`. `timezone` defaults to `Asia/Aden`, and `week_start_day` is `sunday|monday`. It also defines one Zod input schema per form and `SECTION_META`, which gives each of the nine sections its feature key, auto/explicit mode, owner-only flag, endpoint, and the fields ⌘K can search.
- `src/mocks/settings/state.ts`: a per-store row on `globalThis`, with validation that mirrors the forms and returns DRF `{field:[msg]}` 400s. It computes `display_*` and `fx_preview` itself (the UI never converts currency). `multi-location` returns a readable **409** `{detail, conflicts:[{location, products_with_stock}]}` when turning it off would merge stock, unless `merge: true` is sent.
- `src/mocks/settings/overlay.ts`: holds the saved store name, WhatsApp number and announcement fields. `tenantFixture()` merges them, so the shell (session) and `/api/v1/config/` reflect a save immediately, with no import cycle.
- BFF: `GET /api/bff/settings`; `PATCH /api/bff/settings/{identity,contact,policies,shipping,currency,seo,announcement,payments}`; `POST /api/bff/settings/multi-location`. A single factory (`src/mocks/settings/routes.ts`) gives a 403 unless the caller is the owner (shipping, currency, payments, multi-location) or the owner/«مدير المتجر/الفرع» (the text sections).

```
GET    settings                       → 200 (whole row)
PATCH  settings/currency {usd_to_sar:"0"} → 400 {"usd_to_sar":["يجب أن يكون أكبر من صفر."]}
POST   settings/multi-location {enabled:false} → 409 {"detail":"يوجد مخزون في أكثر من موقع…","conflicts":[{"location":"فرع الرياض","products_with_stock":14}]}
PATCH  settings/identity (cashier) → 403 {"detail":"تعديل الإعدادات مقصور على المالك ومدير المتجر."}
```

## T084 — Hub UI

- **Frame** (`settings-shell.tsx`, `settings/layout.tsx`): a sticky 220px vertical nav at the start with a 1px end border, and content capped at 720px. Below `md` the nav becomes a sticky select. Sections whose feature is off are absent, and opening one by URL redirects to «الهوية» with a notice (FR-34.11). A red dot marks the money/structure sections.
- **Index** `/dashboard/settings`: text rows in two groups, each showing the section's current value («العرض بريال سعودي · 1 USD = 3.75 SAR»). The «المال والبنية» group sits behind a thin red rule. No equal cards and no icon tiles.
- **Auto-save** (identity, contact, policies, SEO, announcement — `useAutoSave`): fires 800ms after the last edit, or immediately on blur. Only the changed fields are sent, after Zod validation. The indicator shows «يُحفظ…» then «تم الحفظ hh:mm» in Mono. On a network error it shows «لم يُحفظ — إعادة المحاولة» and retries once after 5s. A pending save is flushed when the section unmounts, so switching sections never loses an edit. Server field errors go under their field and the first one gets focus. A store-name save calls `router.refresh()` so the shell updates at once (US-34.2.2).
- **Explicit save** (shipping, currency, payments, multi-location — `useExplicitSection`): nothing auto-saves. «حفظ التغييرات» stays disabled until something changes, and every save goes through a confirmation that says what will happen. While a section is dirty, the sticky «لديك تغييرات غير محفوظة» bar holds navigation to other sections; «حفظ» opens the confirmation and «تجاهل» resets, and either way the held navigation then continues. `⌘S` opens the confirmation, `beforeunload` warns, and these sections sit in a thin red frame with no fill.
- **Sections:**
  - Identity: name counter, about-us counter, a searchable IANA time-zone picker built on `Intl.supportedValuesOf('timeZone')` that shows the current time there in Mono, and a segmented week start with the «يؤثر على التقارير الأسبوعية…» hint.
  - Contact: WhatsApp is normalised and previewed, with «زر واتساب سيُخفى» when it's empty. Email, then `custom_domain` read-only with a link to M19, then 4 social URLs in LTR.
  - Policies: a text format of `##` headings, `-` lists and blank-line paragraphs, with a toolbar. The «كما يراها المشتري» preview renders through the shared `src/components/ui/rich-text.tsx` as React elements, not HTML.
  - Shipping: amounts labelled «ريال يمني (عدن) YER_NEW»; the server's `display_*` preview; a warning when the free-shipping threshold is below the fee.
  - Currency: display currency, 3 Mono rates, and the server's `fx_preview` table for 100 SAR; the confirmation says «الطلبات السابقة لا تتأثر».
  - SEO: counters for 70, 160 and 255 characters, an OG image with an extension check, and a text-only search-result preview.
  - Announcement: a live preview using the shared `src/components/ui/announcement-bar.tsx` (marquee scrolling toward the reading direction, frozen under `prefers-reduced-motion`), hex inputs with a swatch, «تباين أقل من AA», three speeds and four placements.
  - Payments: two switches; «لن يستطيع المشترون الدفع إلا عند الاستلام» when both are off; «الطلبات الجارية لا تتأثر» when turning off Sharwa Pay with pending orders.
  - Locations: a switch and a confirmation that explains the stock move. A 409 lists the conflicting location and offers «دمج الكميات وإيقاف».
- **⌘K:** each searchable field is indexed as «إعداد: …» → `/dashboard/settings/<section>#<field>`, and the section focuses it on arrival (US-34.1.3).
- **Staff:** a cashier sees «الهوية» and «الدفع» only, both read-only («للقراءة فقط — تحتاج صلاحية مالك المتجر»).

## Shared changes

- `src/lib/api-error.ts`: `ApiError.body` keeps the parsed JSON. That is how the 409's conflict list reaches the UI. Arrays of objects no longer go into `fields`, which hold messages only.
- `navigation.ts`: «معلومات التواصل», «الصفحات الإضافية», «أسعار الصرف» and «إعدادات SEO» now open the hub sections. The sidebar groups keep their names and places.
- `globals.css`: two keyframes (`sharwa-nudge`, `sharwa-marquee`).
- `badges-tab.tsx` (3D): the contrast ratio is wrapped in `dir="ltr"` so it reads «17.7:1» and not «1:17.7».
- `scripts/visual-check.ts` (3D): Base UI's hidden switch/checkbox proxies are exempt from the 44px check.

## T085 — Gates

```
$ npm run lint      → (no output)
$ npx tsc --noEmit  → exit 0
$ SHARWA_CHROMIUM=… npx tsx scripts/settings-check.ts 3300
✓ no save before the 800ms debounce
✓ «تم الحفظ hh:mm» after the auto-save
✓ the new store name reaches the shell without a reload
✓ an edit followed at once by a section switch is saved
✓ server 400 is shown under its field
✓ low contrast between the two bar colours → «تباين أقل من AA»
✓ «حفظ التغييرات» is disabled until something changes
✓ a zero rate is refused locally
✓ the explicit section did not auto-save
✓ dirty → section navigation is held by the unsaved bar
✓ the confirmation says previous orders are not affected
✓ saved after confirming; the held navigation continued; fx_preview recomputed by the server
✓ ⌘S/Ctrl+S opens the confirmation
✓ «تجاهل» drops the change and continues the held navigation
✓ 409 is readable: the conflicting location is listed
✓ «دمج الكميات وإيقاف» completes the change
✓ ⌘K «المنطقة الزمنية» opens identity with the field focused
✓ a section whose feature is off redirects to «الهوية»
✓ a cashier sees identity read-only
✓ payments: read-only, no save button for staff
✓ phones: the section nav is a select
✓ phones: choosing a section in the select navigates
✓ Phase 3E functional check passed
$ … scripts/catalog-orders-check.ts 3300   → ✓ Phase 3D functional check passed (regression)
```

`docs/visual-checks/34-settings/` (41): the index on 4 viewports; each of the nine sections on desktop, mobile and dark; staff index and payments (read-only); the auto-saved state, unsaved bar, currency confirmation, contrast warning and 409 panel.

Fixed during the gates:
- Inline links inside setting descriptions were 18px tall on mobile. Descriptions are now `<p>` (prose), matching the checker's existing rule.
- Monospace on Arabic policy text broke the letter joining; the font is removed.
- Base UI puts a field's `id` on its hidden input, so ⌘K focus now moves to the visible `role="switch"`.

## Deviations

These are listed under 3E in `tasks.md`:
- No T082 tag.
- An index page instead of a redirect.
- `locations` page vs the `multi-location` route.
- Sidebar links point at the hub.
- Owner-only money sections (shipping included).
- The light policy format.
- Config cache revalidation lands with the storefront's cached reads (Phase 4).
- No cross-tab `version`.
- The OG image is sent as a data URL until the multipart endpoint exists.

---

# Execution log — Phase 3D · M04 Products · M05 Organization · M06 Orders · M48 Command palette · M49 Notifications (T068–T081)

**Date:** 2026-10-18 · **Branch:** `master` · **Base:** device working tree after 3C (HEAD `57a5da8` + uncommitted M02) · **Restore point:** `rp/14-next-phase-before` (owner-run, see T068)
**Status:** T069–T080 done. T081 gates pass: `npm run lint` ✅ · `npx tsc --noEmit` ✅ · `scripts/catalog-orders-check.ts` **21/21** ✅ · visual check **74 screenshots**, 0 console errors, 0 horizontal scroll, every mobile target ≥ 44px. **No commit and no `*-after` tag** — held for owner review. Backend (`C:\sharwa_saas`) untouched.

---

## T068 — Restore point (owner)

Running git on the owner's machine from this session was refused by the security policy, so the two commands are the owner's:

```
git add -A -- . ':!.handoff'        # -am alone would miss M02's NEW (untracked) files
git commit -m "feat(m02): complete onboarding wizard"
git tag -a rp/14-next-phase-before -m "Before starting tasks from T068"
```

Checked on the device before delivery: `.git/refs/tags/rp/` ends at `13-onboarding-before`, and `.git/logs/HEAD`'s last entry is `feat(tenant,dashboard): M47 tenant guard + M03 …`. Phase 3D was first delivered as patches under `.handoff/phase-3d/`; **superseded in 3E** — the patches were committed but never applied, so 3E wrote every 3D file straight into the tree (see 3E «Delivery»). Logged in `.specify/memory/restore-points.md`.

## T069 — Shared data table

`src/components/shared/data-table/*`: TanStack Table 8, 44px rows (36px compact), sticky header, horizontal hairlines only, numeric columns `text-end font-mono`, density toggle; page/page_size/ordering/density in the URL (`useTableUrlState`, nuqs); `J/K` row focus, `Enter/Space` open; multi-select → bulk bar → `BulkActionDialog` (preview by count → run → «N نجحت، M مرفوضة» with reasons; `confirmDisabled` added in 3D for required targets); states: skeleton · empty · no-results · error · forbidden; `renderMobileCard` below `md`. `FilterBar` (inline ≥ md, bottom drawer below), `SearchBox` (300ms debounce), `StatStrip` (text number strip, each entry a filter — no KPI cards).

## T070–T073 — M04 Products & variants

- Schemas: `src/features/products/schemas/{enums,product,variants,templates}.ts` (Product with every data-model §4 enum verbatim).
- Mocks: `src/mocks/catalog/{seed,state,products,dictionary,import}.ts` — `noor` full (60 products), `shop` empty; per-store state on `globalThis`.
- BFF: `src/app/api/bff/products/**` through `mockRoute` (see BFF README).
- Screens: list (StatStrip · filters in URL · inline price/stock edit with block reasons · bulk publish/archive/category/tag/delete), quick add (`?quick=true`, 4 required fields, `Q`), full editor (conditional sections, local draft autosave via `useSyncExternalStore`, leave guard, `⌘S`, dnd gallery with 5s undo, variant generator + matrix with paste, change log tab), variants dictionary, templates (apply/sector), CSV import (3 stages).
- Decisions: `@dnd-kit/utilities` is transitive → local `src/lib/dnd.ts`; ES2017 target → `BigInt(…)` constants in `src/lib/decimal.ts`; list image from the gallery only + `ProductThumb` `onError` fallback (a broken external `image_url` logged a console error); `instant = false` on `[id]` pages; `await connection()` first in `CsrfBootstrap`, the shell layout and the overview page (dev prerender flagged `Date.now()` from fetch instrumentation); overview/counters mocks now read the real catalog/orders fixtures.

## T074 — M05 Organization

`src/features/organization/*` + `src/app/api/bff/{categories,brands,tags,collections,badges}/**`.

- **Category tree** (`category-tree.tsx`, `tree-utils.ts`, Zustand `src/stores/category-tree.ts`): flattened dnd-kit tree; the dragged node's subtree is removed while dragging (no cycles; the mock rejects one with 400 too); projection by horizontal offset with the **RTL sign** (deeper = towards the left); 1px `foreground` drop line at the projected depth; one `POST categories/reorder {moves}` with only the changed rows, optimistic + rollback toast; keyboard: Space lift · ↑/↓ move · ←/→ depth · Space drop · Esc, announced in Arabic via `aria-live`; mobile/no-drag «نقل إلى…» dialog; collapse; depth > 3 warning; `N` new category; delete dialog with «نقل المنتجات إلى…/إبقاؤها بلا تصنيف» (`reassign_to`) and children → grandparent/root; an empty leaf deletes with a 5s «تراجع».
- **Brands**: table with 32px logo (`next/image` via `ProductThumb`), add row on top saved by Enter, slug auto + editable, server field errors under the field.
- **Tags**: create by typing + Enter (60-char counter), rename in place (Enter/Esc), merge dialog, «غير مستخدم» after 30 days with no products.
- **Collections**: list + create dialog → editor page `products/organization/collections/[id]`: product search (name/SKU, 250ms) with «في المجموعة», drag reorder (optimistic), remove, «مؤرشف» badge + suggestion, copyable `?collection=<slug>` link, bottom drawer for search on mobile.
- **Badges**: hex + 16px swatch, mini product-card preview, «تباين ضعيف» warning (WCAG 4.5) without blocking save, the three dynamic badges read-only.
- Shared delete flow: `undo-delete.ts` (row leaves the cache at once, the request is sent only when the 5s window closes; failure restores it) and `ConfirmDelete` for entities with products.
- Staff without catalog rights: tree read-only (no handles, no buttons), verified in the functional check.

## T075–T078 — M06 Orders

`src/features/orders/*` + `src/app/api/bff/{orders,order-statuses}/**` (120 mock orders).

- **List** (`orders-table.tsx`, `orders-screen.tsx`): StatStrip from `orders/counters` (جديد · بانتظار تأكيد الدفع · يتطلب مراجعة دفع · each fulfilment status), tooltip saying the counters ignore the filters; columns #, customer (+phone Mono), total (`display_total`), payment, **financial status (zinc text badge)** and **fulfilment (6px dot in `OrderStatus.color` + name)** — never merged; filters status/payment/fulfilment/channel/source/location/from/to/q in the URL; inline fulfilment menu with `version`; bulk change = one versioned call per order with a per-order report; mobile cards → full page; empty «لا طلبات بعد — شارك رابط متجرك» + copy link; `?order=<id>` side sheet.
- **Detail** (`order-detail.tsx`, one component for sheet + `orders/[id]`): both axes in the header, items (snapshot, «محذوف»), invoice rows from `display_*` incl. «مدفوع مقدماً/المستحق عند الاستلام», fulfilment cards per location + «قيد التنفيذ الجزئي (x من y)», payments, refunds, merged timeline with source labels, customer + COD trust, gift recipient apart from the buyer. `E` opens the fulfilment menu, `P` prints.
- **Actions** (`order-actions.tsx`): financial status with legal targets only (others disabled with a hint, `refunded` → «استخدم مسار الاسترجاع»), confirm dialog for stock effects (cancel / re-activate «سيُخصم المخزون مجدداً»); payment confirm/approve/reject with the receipt diff in a semantic colour + zoom; refund form (≤ refundable, method, reason); convert to pickup; gift note; print.
- **409** (`use-order-write.ts`, `conflict-panel.tsx`): a stale `version` parks the write, shows «حُدِّث الطلب #… من مستخدم آخر» inline, reloads the order; «تحديث ثم إعادة المحاولة» re-sends the SAME write with the fresh version.
- **Print**: `(print)` route group with its own `requireSession()` layout and no shell chrome; A4 RTL waybill; gift orders print without prices.
- **Statuses** (`orders/statuses`): drag order (optimistic), create/edit dialog (name 60, colour, default / releases_stock / marks_completed — mutually exclusive), the default cannot be deleted (button visible + disabled + reason), delete moves orders to the default.
- **Manual order** (`orders/new`): product search, variant per line, quantity stepper, phone normalised (05… → 966, else 967), delivery/pickup, `sales_channel: phone`; «مسودة جملة» only with `orders.create_b2b` → approval id in the toast. No client-side totals.
- Found and fixed while testing: Base UI `MenuGroupLabel` must sit inside `Menu.Group` (runtime error on opening a status menu).

## T079 — M48 Command palette

`src/features/command-palette/*`, Zustand `src/stores/palette.ts`, mounted once in `(shell)/layout.tsx`; the topbar search button is live.

- Opens with Ctrl/⌘+K by **`event.code === "KeyK"`** (works on an Arabic layout), skipped inside `[data-no-palette]`; Dialog 640px at 12vh, top drawer below 768px.
- Index from `navigation.ts` filtered by features/permissions **before** display (blocked = absent; «قريباً» disabled); ranking by the shared `matchScore` normaliser (word start > substring > fuzzy, article stripping) — «الطلبت» → «كل الطلبات» first.
- Query shape (FR-48.06): `#`/digits → orders first · phone → customers · `SHW-` → products · `>` → actions only.
- Server search: ≥ 2 chars, 150ms debounce, abandoned keys aborted, `limit=5`, `types` trimmed by permission, 2-row skeleton per group, «لا طلبات أو منتجات أو عملاء تطابق…», thin bar on network error / 429.
- Recents: `sharwa:recent:<store>:<member>` (≤ 10, 5 shown), blocked destinations dropped silently, cleared on logout (user menu and palette).
- Contextual: Tab on a selected order (or on an order page) → fulfilment statuses (disabled with the reason without permission), print, copy tracking link; 409 → Sonner «تحديث ثم إعادة»; other failures → «إعادة» reopens the palette on the same page. Backspace on an empty query goes back; Ctrl+1..9 runs the n-th item; store switcher page for owners with > 1 store.

## T080 — M49 Notifications

`src/features/notifications/{api.ts,components/notification-bell.tsx}`; the topbar bell is live.

- Summary polled every 30s **only while visible** + on focus; Mono count with `99+`, a red dot only for unread critical, nothing at 0, `aria-live` count.
- Panel: 400px sheet from the start side (full width on phones), «الكل · غير المقروء» + kind filters with counts (filters this member never receives are hidden), `?kind=` in the URL, rows grouped by the server's `group_key` with expand, severity dot (warning/critical only), only `/dashboard…` links followed (FR-49.04), optimistic read / read-all with rollback, `E` / `Shift+E`, Esc returns focus to the bell, «الإشعارات غير متاحة حالياً» when the backend is absent.

## T081 — Gates

```
$ npm run lint      → (no output)
$ npx tsc --noEmit  → exit 0
$ SHARWA_CHROMIUM=… npx tsx scripts/catalog-orders-check.ts 3300
✓ product #2004 has 2 generated variants (S, M)
✓ phone order #10483 created and opened
✓ order lists the variant product
✓ new order appears in the orders list
✓ financial axis followed «مكتمل» (status=completed)
✓ 409 → conflict panel «حُدِّث الطلب من مستخدم آخر»
✓ retry re-applied the change on the fresh version (now «قيد التوصيل»)
✓ drag shows the 1px drop indicator
✓ dragging «ديكور» towards the indent nests it one level
✓ keyboard Space/↑/Space moves «نسائي»
✓ the drop is announced in Arabic through aria-live
✓ Ctrl+K opens the palette by event.code (Arabic layout)
✓ `#id` → Enter opens the order
✓ Tab on an order page → contextual fulfilment commands
✓ Backspace on an empty query goes back to the root
✓ Esc closes the palette
✓ kind filter lives in the URL (?kind=payment_review)
✓ read-all (payment_review) updates the count optimistically (5 → 3)
✓ Esc returns focus to the bell
✓ staff (cashier) sees the tree read-only
✓ cashier with orders.view sees the orders list
✓ Phase 3D functional check passed
```

Visual checks (`npm run visual-check`, `--cookie sharwa_mock_session=merchant`), all ✓:

| Folder | Screens |
|---|---|
| `04-products/` (17) | list ×4 viewports, editor, quick add, variants, templates, import, empty store |
| `05-organization/` (22) | categories ×4, brands, tags, collections, badges, collection editor, empty tree, row actions, tree while dragging, staff read-only |
| `06-orders/` (24) | list ×4, sheet (+dark), detail, payment review (+mobile, dark), no results, empty store, statuses, new (+filled), print, 409 panel, completed order |
| `48-command-palette/` (6) | empty desktop/mobile/dark, `#id` results, order commands, no results |
| `49-notifications/` (5) | panel desktop/mobile/dark, staff, interactive |

Fixes the gates forced: `ErrorState` retry button and the quick-add «خيارات إضافية» toggle were < 44px on mobile; collection editor / order detail / new order grids overflowed 48px at 390px (`grid-cols-[minmax(0,1fr)]`); the mobile notification sheet kept the default 75% width; `MockIndicator` is now `print:hidden`. `scripts/visual-check.ts` now also exempts Base UI's `position: fixed` 1px form proxies (like the existing skip-link exemption).

Also fixed: the sidebar marked both «جميع المنتجات» and «التنظيم والاكتشاف» active — only the most specific item is active now.

## Deviations

The full table is under 3D in `specs/001-sharwa-frontend-platform/tasks.md`. Summary: tag `rp/14` (owner-run) + patch delivery; one organization screen with `?tab=`; `form-options` carries `locations` (M22, `[NEEDS BACKEND]`); bulk = per-order versioned calls; «حفظ كعرض» not built; `E`/`P` in the detail only; manual order gated by `orders.update_status`; the 42 reports not indexed (M25); bell poll 30s (task text) and no `N` shortcut (conflicts with M04/M05 `N`); sidebar counters still from `dashboard/counters`; notifications full page / Web Push (P2) not in T080.

## Owner decisions still open

1. The 3C PPR question (global `cacheComponents: false` or accept the measured deviation) — unchanged by 3D.
2. `«حفظ كعرض»` (saved views) for M06 — build in a later phase or drop.
3. Unify sidebar counters on `notifications/summary` (FR-49.11) when M49's backend exists.

---

# Execution log — Phase 3C · M02 Onboarding Wizard (T061–T067)

**Date:** 2026-10-18 · **Branch:** `master` · **Base:** `57a5da8` · **Restore point:** `rp/13-onboarding-before`
**Status:** T061–T066 done. T067 gates pass. **No commit and no `*-after` tag**: both are held for owner review, as the directive asked.

---

## T061 — Restore point

```
$ git commit -am "chore: prepare for 3C and fix PPR status codes" || true
On branch master
nothing to commit, working tree clean
$ git tag -a rp/13-onboarding-before -m "Before M02 Onboarding"
$ git show --no-patch --format='%h %s' rp/13-onboarding-before
57a5da8 feat(tenant,dashboard): M47 tenant guard + M03 dashboard shell and overview
```

The tree was clean, so the commit was a no-op. The tag points to `57a5da8`, the same commit as `rp/12-tenant-shell-after`. It's logged in `.specify/memory/restore-points.md`.

**The approved PPR fix was NOT applied.** Measured against `node_modules/next/dist/docs` for Next 16.4.2:

- Both `experimental.ppr` and the per-segment `experimental_ppr` are **removed** (`migrating-to-cache-components.md` §`experimental_ppr`). Next 16.4 can't disable PPR "for the tenant layout" alone.
- The only remaining lever is the global `cacheComponents: false`. That would break `"use cache"` + `cacheLife`/`cacheTag` in `src/features/landing/api/{plans,stats}.ts` and `site-footer.tsx` (M01), `partialPrefetching: true`, and the `export const instant` segment exports in 3B. It is a cross-module R-02 change, outside M02's scope.
- **Owner decision needed:** go global (and migrate M01 caching to `unstable_cache`/`fetch` caching), or accept the measured 3B deviation (correct status in dev and on RSC requests, while the production document returns 200 with `Retry-After`).

---

## T062 — Schemas + content

- `src/features/onboarding/schemas.ts`
  - `registrationDraftSchema`: exactly the `TenantRegistrationForm` fields (FR-02.02). The store name is 3–100 characters with the verbatim message «اسم المتجر من 3 إلى 100 حرف». The phone is normalized and must match `^(967|966)\d{9}$`. The subdomain uses the shared `validateSubdomain`, so the four reasons are verbatim. Consent is required.
  - Response schemas: `marketCategoriesSchema`, `checkSubdomainSchema` (Django omits `reason` when the name is available), `registerResponseSchema`, `verifyResponseSchema`, `resendResponseSchema`.
- `src/features/onboarding/onboarding.content.ts`: every visible string, the three FR-02.08 headings verbatim (emoji removed), and the terms text. Numeric sentences are split into `before`/`after` parts so every number renders in `<Mono>`.
- `src/features/onboarding/handoff.ts`: the `sharwa_prov` cookie helpers, the single localStorage key (FR-02.09), and `firstEntryUrl()`.

## T063 — Mocks + BFF handlers

| Adapter | Mode |
|---|---|
| `GET /api/bff/public/market-categories` | target `/api/v1/public/market-categories/` → mock |
| `POST /api/bff/public/register` | target → mock (400 `{field:[msg]}`, taken phone `967770000011`, taken subdomain) |
| `POST /api/bff/public/register/verify-otp` | target → mock (400 wrong code · 410 expired · 429 after 5 wrong codes, 60s · uniqueness re-checked) + sets `sharwa_prov` |
| `POST /api/bff/public/register/resend-otp` | target → mock (429 within 30s or after 3 sends) |
| `GET /api/bff/public/provisioning/[token]` (existing) | `gone…` / unknown → 404 `{detail}`; clears `sharwa_prov` on `ready` |

- The shared `target → mock` helper is in `src/lib/bff/target-adapter.ts`. Django on :8000 returns 404 for the four `[NEEDS BACKEND]` routes, so the mock answers with `x-sharwa-mock: 1`. `check-subdomain` remains the real legacy Django answer.
- **Decision: a wizard registry on `globalThis`** (`src/mocks/public/register.ts`). `tenantFixture()` consults it, so `<new>.localhost` returns 503 + token while provisioning and a zinc-default store once `ready`. The session mock reads the real name, and the overview mock treats the store as empty. Reason: route handlers and Server Components get separate module copies in one process; without the registry, the redirect after `ready` lands on the 404 guard. The fixture code is the single documented `MOCK_OTP_CODE` (`123456`).

API smoke test (curl, literal):

```
--- register bad      {"store_name":["اسم المتجر من 3 إلى 100 حرف"],"merchant_phone":["رقم واتساب غير صحيح"],"subdomain":["محجوز للنظام"],"agree_terms":["يجب الموافقة على الشروط"]}
--- register taken    {"merchant_phone":["هذا الرقم مرتبط بمتجر"]}
--- resend <30s       HTTP/1.1 429 · retry-after: 29 · {"detail":"محاولات كثيرة، حاول بعد 29 ثانية"}
--- verify wrong      HTTP/1.1 400 · {"code":["الرمز غير صحيح"]}
--- verify ok         set-cookie: sharwa_prov=st-…; Path=/; Max-Age=1800; HttpOnly; SameSite=Lax
--- store before      307 http://smoke284.localhost:3000/_tenant/provisioning
--- polls             pending, pending, provisioning, provisioning, ready (+ set-cookie: sharwa_prov=; Max-Age=0)
--- store after       200
--- gone token        HTTP/1.1 404 · {"detail":"لم نجد طلب التأسيس هذا."}
```

## T064 — Panel 01 `/register`

`src/app/(onboarding)/register/{layout,page}.tsx`, `features/onboarding/components/{register-form,wizard-steps}.tsx`, `hooks/use-subdomain-check.ts`, `src/stores/onboarding.ts`.

- **Frame:** one 480px column with a text wordmark (no emoji, I-ب) and an `01 / 02 / 03` Mono counter. On desktop, the opposite column explains the steps with large Mono numerals.
- **Live check:** local rules first (reserved names make no network request), then a TanStack query on a 400ms-debounced value. The query consumes `signal`, so a superseded request is aborted. The result shows inside the field: «جارٍ الفحص» / «متاح» in `text-success` / the verbatim reason. A network failure shows «سيُفحص عند الإرسال» and still allows submitting. A `{sub}.{base}` Mono LTR preview sits under the field.
- **Other fields:** the phone is `dir="ltr"` + `inputMode="numeric"`, with a normalized Mono hint. The name auto-suggests a Latin subdomain until the subdomain field is edited. Category chips are 44px on mobile, show a skeleton while loading, and are hidden silently on error. Consent opens a terms dialog. The submit button is sticky on mobile.
- **State:** Zustand persisted to **sessionStorage** with `skipHydration`, so the first render matches the server. Nothing personal ever appears in a URL.
- **Decision:** consent is not part of the disabled-button rule. US-02.1 ("disabled until valid") and US-02.1.3 ("pressing without consent focuses the box") contradict each other, so the button waits for the three fields and the consent box is checked on submit.
- **Decision:** a server field error keeps the button disabled until that field is edited, even if the live check says «متاح».

## T065 — Panel 02 `/register/verify`

`register/verify/page.tsx`, `components/otp-form.tsx`.

- Six cells in an LTR grid. The sixth digit auto-submits; pasting six digits fills the cells; Backspace and arrow keys move between cells.
- A Mono TTL countdown is derived from `expires_at`, so a reload doesn't reset it. At 00:00 the cells are disabled and «إرسال رمز جديد» is the only action.
- Error handling:
  - 400 → «الرمز غير صحيح» and the cells clear.
  - 410 → the expired state.
  - 429 → a live «محاولات كثيرة، حاول بعد N ثانية» countdown with the cells (or resend) locked.
  - A uniqueness rejection → back to panel 01, with the message on its field and the other values kept.
  - A network error → keeps the values and offers one retry button.
- On success, the BFF sets `sharwa_prov`; the client stores `{token, store_name, masked_phone}` (no full number) and drops the draft.
- **Bugs found and fixed during verification:**
  1. A race: clearing the session triggered the "no session → /register" effect before the status navigation landed. Fixed with a `verifiedToken` field in the store; a revisit to `/verify` after success now goes to the status page.
  2. Next 16 keeps visited routes mounted but hidden (`<Activity>`, see `preserving-ui-state.md`). The OTP panel is now keyed by `otp_token`, so a lockout or expired state can't leak into a new registration. Panel 01 subscribes to `draftErrors` so a returning server error lands even though the form doesn't remount.

## T066 — Panel 03 `/register/status/[token]`

`register/status/[token]/page.tsx`, `components/registration-status.tsx`. Changed: `features/tenant/components/provisioning-poller.tsx`.

- The poll engine was extracted into `useProvisioningPoll` with two policies:
  - `store` (M47): unchanged behaviour, except a 404 token now falls back to the visitor path, as the T051 comment intended.
  - `platform` (M02): 3s; 15s while `failed`; exponential backoff up to 30s on errors; 404 is final.
- **Pre-existing M47 bug fixed:** «تحقق من اتصالك» could never appear, because with `retry:false` TanStack resets `failureCount` on every fetch. Consecutive failures are now counted by the hook.
- **Screens:**
  - Waiting: «جارٍ تجهيز متجرك {name}», text steps, one status dot, Mono elapsed time, the quiet 90s line, and «نحاول الاتصال…» with the last successful check.
  - Failed: the heading, the masked number in Mono, and WhatsApp support; polling continues.
  - Unknown token: «لم نجد طلب التأسيس هذا» + «ابدأ من جديد».
- **Decision:** `ready` shows the verbatim heading, both buttons and a copyable Mono link, then a visible 5-second countdown to `dashboard_url/setup-password?t=<token>`. This combines US-02.4.1 (buttons) with T066 (auto-redirect). A new store has no password, so the bare `dashboard_url` would bounce to login (US-02.6). Copying the link pauses the redirect. `ready` also clears the localStorage entry and the cookie.

## T067 — Quality gates

```
$ npm run lint            → exit 0
$ npx tsc --noEmit        → exit 0
```

**tsc caveat (pre-existing, not 3C code):** `tsconfig` includes both `.next/types` (from `next build`/`typegen`, route `/_d/[store]/dashboard`) and `.next/dev/types` (from `next dev`, route `/%5Fd/[store]/dashboard`). When both exist they conflict (TS2344 in `validator.ts`). This comes from the approved `%5F` folders. I deleted the stale build copy (regenerated output). A permanent fix, such as including only one folder, is for the owner to decide.

**Functional check:** `npx tsx scripts/onboarding-check.ts 3000`. **33 checks passed, 0 console errors**, re-confirmed on a cold server on :3200.

```
Timing: OTP accepted after 7.5s, dashboard after 30.7s      (budget ≤ 60s)
✓ onboarding check passed
```

It covers: the `?store_name=` prefill · the `nourshop` suggestion · submit disabled · no scroll at 1440×900 · `www` rejected with no request · `My-Store` · the name-length message · the Mono-normalized number · consent focus · no personal data in any URL · 6 cells · wrong code · paste + auto-submit · the `sharwa_prov` HttpOnly cookie on `<base>` · localStorage without the number · waiting → ready headings · the entry cleared at ready · auto-redirect to the store's `/dashboard/setup-password?t=` · the cookie cleared · setting a password → the new store's dashboard · `x-sharwa-mock: 1` · 429 · TTL expiry (Playwright clock) · the uniqueness race back to panel 01 · a direct visit to `/verify`.

**Visual check:** `scripts/visual-check.ts`. **All pass** (0 console errors, 0 horizontal overflow, every target ≥ 44px on mobile). `docs/visual-checks/02-onboarding/` holds 25 screenshots:

- Form: desktop · tablet · mobile · desktop-dark · mobile-dark
- Waiting, ready, failed, not-found: desktop · mobile · mobile-dark each
- From the flow script: form errors · form filled · server error · OTP (desktop, mobile) · 429 · expired · first-entry dashboard

Fixed during visual review:

- Touch targets: the subdomain input and the copy button were 42px, and the ready-panel links were 22px (`flex-1` in a column sets `flex-basis: 0`).
- The status divider was on the wrong side (`border-s` resolved inside `dir="rtl"`).
- A duplicate global `:focus-visible` ring on the subdomain input.
- The OTP cells hugged the left edge; they now span the column.

**M47/M03 regression:** `scripts/tenant-shell-check.ts`. 8/8 on :3000. On a cold :3200 server, `M03 §6 — [ يطوي الشريط` failed in one run out of two, with zero diff under `dashboard-shell/` and `stores/shell.ts`. The script presses `[` 250ms after navigation without waiting for hydration. This is a pre-existing test race, left untouched (out of scope).

**Environment notes:**

- The :3000 dev server (started outside this session) stopped near the end of the run. I started a temporary `next dev -p 3200` for the final regression, then stopped it, and the port is free.
- One stale Turbopack SSR module after rewriting `provisioning-poller.tsx` caused a transient 500 that cleared after a recompile.

**Not done (stop rule):** the T067 commit and the `rp/13-onboarding-after` tag. T067 is left unchecked in `tasks.md` for that reason.
