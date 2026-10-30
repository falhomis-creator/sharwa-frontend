# Known inconsistencies and fix tasks

> **Source**: DOC-528 · inventory A.13 "Known inconsistencies"
> **Code**: `sharwa-frontend/.env.example` · `sharwa-frontend/src/app/api/bff/…` · `docs/architecture/23-ready-api-v1-audit.md` · `docs/architecture/21-mock-runtime.md`
> **Last verified against code**: 2026-10-30 (official Step 52 — KI-01, KI-02 and KI-03 closed in code)

## 1. Purpose

This register lists the places where the repository disagrees with itself — an environment sample behind the code, a route left without a consumer, an audit list that aged — and states for each whether it is **fixed** (with the step that fixed it) or **scheduled** (with the task that carries it). Nothing here is user-visible behaviour; those items live in [`90-open-items.md`](90-open-items.md).

## 2. Register

| ID | Inconsistency | Evidence | Status | Fix task | Impact on docs |
|---|---|---|---|---|---|
| KI-01 | `.env.example` `SHARWA_LIVE_MODULES` sample line omits the keys `inventory`, `locations`, `returns`, `wallets` — a developer copying the sample cannot switch those four modules live, although their BFF rules and Django endpoints exist (inventory A.3 is the authoritative key list) | `.env.example:79` (the commented sample lists 36 keys, none of the four); keys exist in `src/lib/bff/live-route.ts` and are documented in [`22-live-module-keys.md`](22-live-module-keys.md) | **fixed** — Step 52 (2026-10-30): the sample line (now `.env.example:86`) lists all 39 keys and the comment block describes `integrations`, `inventory`, `locations`, `returns`, `wallets`; `check_terms.py` rule T1 confirms parity with glossary §4 | DOC-461 · DOC-535 (Step 52) | [`21-mock-runtime.md`](21-mock-runtime.md) §7 and [`22-live-module-keys.md`](22-live-module-keys.md) already list all 39 keys; docs describe the full set, not the sample line |
| KI-02 | Old `account/stores` BFF route kept with no consumer — superseded by `merchant/stores` (INT-003 design, M43 rollout INT-049) | route exists at `src/app/api/bff/account/stores/route.ts` (forwards `GET /api/v1/account/stores/`); a grep of `src/features/` finds **no fetch** of `bff/account/stores` — the only consumer is `src/features/stores-rollup/api.ts:25,36` calling `/api/bff/merchant/stores` (contract `GET /api/v1/merchant/stores/?from&to`, `rollup` live key) | **fixed** — flagged deprecated by DOC-462 (Step 07), **removed in Step 52 (2026-10-30)**: `src/app/api/bff/account/stores/route.ts` and `src/mocks/dashboard/stores.ts` deleted (`git rm`), the three `accountStore*` exports and the unused import dropped from `src/features/dashboard-shell/schemas.ts`, the row dropped from `src/app/api/bff/README.md`; no reference found in `scripts/` or the shell components | DOC-462 (flag) → DOC-535 (removal, Step 52) | [`20-bff.md`](20-bff.md) and the audit page describe `merchant/stores` as the successor; nothing links the old route |
| KI-03 | `ready-api-v1.md` «Ready» passthrough rows aging against Phase-002 shape changes | re-audit completed in official Step 33 (2026-10-27) by DOC-463: [`23-ready-api-v1-audit.md`](23-ready-api-v1-audit.md) — every row re-checked against the Django view/serializer and the Zod schema | **fixed** — audit by DOC-463; in Step 52 (2026-10-30) the §6 replacement table of the audit was applied to `specs/001-sharwa-frontend-platform/contracts/ready-api-v1.md` (30 rows, new «Changed by» column) | DOC-463 (audit) → DOC-535 (list updated, Step 52) | the list and the audit page now agree |
| KI-04 | Mock-vs-Django drifts ("mock aligned" rule) — fixtures must imitate Django, never the reverse | rule and remaining gaps documented in [`21-mock-runtime.md`](21-mock-runtime.md) §6 | **open by policy** — each module aligned at its INT step; four fixture groups remain unaligned (§4) | per-module; none scheduled | docs always describe **Django** behaviour and mark fixture differences on the module's API page |

## 3. Re-audit verdicts for the «Ready» rows (KI-03 detail)

The audit of [`23-ready-api-v1-audit.md`](23-ready-api-v1-audit.md) (all rows checked 2026-10-27) closed the roadmap's re-audit demand:

| Rows | Change | Verdict on the audit page |
|---|---|---|
| #11 `POST /pwa/install-event/`, #13 `POST /push/subscribe/` | INT-016 (rate caps, order-derived phone) | **verified** — "the list already carries the INT-016 change" (`23-ready-api-v1-audit.md:74`, `:76`) |
| #15–#18, #27, #28 returns + RMA + warehouse scan | INT-026 (Returns API mixin gate chain, paginated list, optional `version`, RMA shapes) | **changed** — Django reshaped the rows; Zod accepts the new shape; the original list row is stale (`:85-90`) |
| B2B draft rows | INT-044 (draft order via `create_b2b_draft_order`, tier pricing) | audited with the courier rows; changed shapes recorded on the page (`:3` header, §4 tables) |
| #23–#26 courier agent actions (shifts, scan-pickup, partial delivery) | INT-046 (agent identity = `shipping_provider_profile`, `_agent_owns` ownership check, 2026-09-16 impersonation fix) | **verified/same** — Zod matches; ownership gates recorded (`:185-188`, `:204`) |
| #1–#10 storefront bootstrap, cart, sections | INT-002/010/011/012/013/018 | **changed** — see the audit table sections 4.1–4.3 |

## 4. "Mock aligned" record (KI-04 detail)

Rule ([`21-mock-runtime.md:163`](21-mock-runtime.md)): at each module's integration step the fixture is aligned to Django's rules and messages ("mock aligned" in the INT write-up), so screens behave identically on fixtures and live. Django is always the authority; documentation describes Django.

Fixtures **not** yet aligned (each flagged on its API page, `21-mock-runtime.md` §6):

| Module | Fixture | Difference from Django |
|---|---|---|
| M37 bundles | `src/mocks/product-extras/state.ts:216` | bundle total uses raw component prices; Django converts currencies and uses formula prices |
| M05 categories | `src/mocks/catalog/organization.ts:43,111` | SEO-limit message and PATCH checks differ from Django's sentences |
| M05 brands/tags/collections/badges | `src/mocks/catalog/organization.ts` | delete of unknown id answers `200` (Django `404`); no name limits; no tag-slug suffixing |
| M02 onboarding OTP | onboarding fixtures | OTP lifetime/lock-out 300 s and 5 tries vs Django 600 s and 3 tries |

## 5. Recommendations and what Step 52 did

1. **KI-01, KI-02, KI-03** — done in Step 52 (2026-10-30), see the register. The Postman collection is generated from Django's `api/urls.py`, which has no `account/stores/` path ([`../api/openapi/route-inventory.md`](../api/openapi/route-inventory.md) lists none), and no `scripts/*.ts` file calls the route. Before committing, run `npx tsc --noEmit` and `npm run lint` in `sharwa-frontend`: they are the final guard that nothing else imported the removed types. Two follow-ups from the audit stay outside Phase 003 because they are application code: add `geo_required` to `REJECTION_REASONS` / `REJECTION_TEXT` in `src/features/courier/schemas.ts`, and drop the "proposed" wording from `b2bDraftSchema` ([`23-ready-api-v1-audit.md`](23-ready-api-v1-audit.md) §6).
2. **KI-04**: keep aligning the four fixture groups at their next module touch; do not document fixture behaviour as Django behaviour (the rule docs follow).

## 6. Related pages

- [`90-open-items.md`](90-open-items.md) — not-built features and kept Django rules (user-facing).
- [`91-legacy-surfaces.md`](91-legacy-surfaces.md) — legacy-only features and HTML surfaces.
- [`20-bff.md`](20-bff.md), [`21-mock-runtime.md`](21-mock-runtime.md), [`22-live-module-keys.md`](22-live-module-keys.md), [`23-ready-api-v1-audit.md`](23-ready-api-v1-audit.md), [`../ops/environment.md`](../ops/environment.md).
