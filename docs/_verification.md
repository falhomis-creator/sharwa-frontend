# Documentation verification — consistency, links and publishing checks

> **Source**: DOC-534 (consistency) · DOC-535 (A.13 fixes) · DOC-536 (publishing) · inventory conventions, A.3, A.5, A.6, A.13 · [glossary](glossary.md) · [guides glossary](guides/_glossary.md)
> **Output of**: official Step 52 (M-6 · 4.2 Coverage, consistency & publishing), 2026-10-30
> **Companion pages**: [`_coverage.md`](_coverage.md) (DOC-533, zero-omission matrix) · [`api/_verification.md`](api/_verification.md) (DOC-529/530) · [`guides/_verification.md`](guides/_verification.md) (DOC-531) · [`ops/_verification.md`](ops/_verification.md) (DOC-532)
> **Tools**: [`_tools/`](_tools/README.md) — `check_links.py`, `check_terms.py`, `coverage.py`, `allow.json` (Python 3, standard library only)

<a id="consistency"></a>

## 1. Result

| Check | Before Step 52 | After Step 52 |
|---|---|---|
| Relative links and anchors checked (`check_links.py`) | 6,790 | 6,909 (the new pages add links) |
| **Broken links / anchors** (GitHub rules) | **195** in 20 pages | **0** |
| Screenshots referenced but not captured yet (reported as *pending*, not broken) | 279 | 279 (256 registered in `shots.json`, 23 manual) |
| **Term and consistency findings** (`check_terms.py`, rules T1–T9) | **76** | **0** |
| Accepted exceptions, each with a reason ([`_tools/allow.json`](_tools/allow.json)) | — | 67 (49 fixture phone numbers, 14 money quotes, 2 audit names, 1 migration label, 1 test secret) |
| Glossary rows still marked *(مقترح)* | 64 | 43 — 23 rows now carry the UI label (21 fully, 2 partly; §5) |
| Coverage matrix ([`_coverage.md`](_coverage.md)) | — | 0 empty cells, 0 missing output pages |

Done-when of DOC-534 — "the checker reports zero broken links and zero term violations" — is met.

## 2. What the checkers verify

### 2.1 Links — `python docs/_tools/check_links.py`

| Rule | Detail |
|---|---|
| Target exists | every relative Markdown link and image in `docs/**/*.md` resolves to a file or folder of the repository (outside code spans and fenced blocks) |
| Fragment exists | a `#fragment` must match a **GitHub** heading slug or an explicit `<a id="…">` / `<a name="…">` of the target page. `{#id}` attributes are **not** anchors on GitHub |
| Pending screenshots | an image under `docs/guides/_assets/` that does not exist yet is *pending* when its id is in `shots.json` or its line carries `<!-- capture: … -->`; anything else is broken |
| Placeholders | links containing `<…>` (the page templates) are skipped |

### 2.2 Terms and data — `python docs/_tools/check_terms.py`

| Rule | What must hold | Source of truth |
|---|---|---|
| T1 live keys | every key in a `SHARWA_LIVE_MODULES=` line is one of the 39 keys; the `.env.example` sample line lists exactly those 39 | glossary §4 (= inventory A.3) |
| T2 module ids | `M01`…`M49`, always two digits | glossary §4 |
| T3 permission keys | every backticked `area.action` token shaped like a permission key, and every `check(request, "…")`, is a seeded key | [`api/overview/permissions.md`](api/overview/permissions.md) §2 (37 keys in the tables) |
| T4 plan features | every "plan feature `x`" is a `billing.Feature` code | [`api/overview/plan-features.md`](api/overview/plan-features.md) (51 codes) |
| T5 money | «… ر.س» / «… ر.ي» examples follow `format_money`: thousands commas; a whole SAR amount without decimals, otherwise two; Yemeni rials whole | [`api/overview/money.md`](api/overview/money.md) §3 (A.6) |
| T6 UI words | the Arabic guides use the label on the screen: not «عضو فريق» (→ «موظف»), «صندوق الوارد» (→ «المحادثات»), «محفظة التاجر» (→ «محفظة المتجر» or «محفظة شروة باي للتاجر»), «طابور البوليصات» (→ «طابور AWB»); courier guides say «المناوبة», never «الوردية» | [`guides/_glossary.md`](guides/_glossary.md) |
| T7 anchors | no `{#id}` attribute anywhere (GitHub prints it as text and does not create the anchor) | publishing decision (§8) |
| T8 phone numbers | only fixture numbers appear (each listed in `allow.json` with its source) | Django tests, `src/mocks/**` |
| T9 secrets | no live-looking key or token (`sk_live_…`, `whsec_…`, `AKIA…`, private keys, `shw_pat_…` with a body, GitHub/Slack/Google/Meta tokens) | — |

## 3. Broken links found and fixed

| Cause | Links | Fix |
|---|---|---|
| `{#id}` heading attributes — 71 headings in 11 Domain 5 and Domain 6 API pages plus one inline `{#offer-links}` in `m09-storefront-home-catalog.md`. MkDocs understands them; **GitHub does not**, so every link to them was dead on the chosen publishing target | 181 | each `## Title {#id}` became `## Title <a id="id"></a>` (the convention of the 636 existing anchors); the inline one became `<a id="offer-links"></a>` |
| Anchor never defined | 6 | added `<a id>`: `ops/dev-setup-windows.md` `#local-media`; `ops/management-commands.md` `#migrate_merchant_phone`, `#seed_variant_templates`, `#generate_sharwa_pay_icons`, `#sharwa_ai_engine_status`; `api/domains/05-storefront/m11-cart.md` `#not-wired` |
| Wrong slug | 1 | `api/domains/16-platform-console/m20-console.md` → `#46-feature-catalogue-resolution-and-overrides-doc-271` |
| Wrong relative depth | 7 | `architecture/90-open-items.md` (2 × `../../api/…` → `../api/…`); `architecture/data-model/15-reports.md` (5 × `../02-dashboard-shell.md` / `../08-finance.md` → same folder) |
| **Total** | **195** | **0 left** |

The link to `api/domains/16-platform-console/m46-plans-billing.md#44-getpost-apps--patch-appscode--…` from `m30-app-store.md` was checked by hand: it is correct for GitHub (backticked `<code>` and `<id>` stay part of the slug).

## 4. Term, data and naming fixes

| Rule | Page | Before | After |
|---|---|---|---|
| T1 | `.env.example` | sample line with 35 keys | 39 keys + comment lines for `integrations`, `inventory`, `locations`, `returns`, `wallets` (KI-01, DOC-461) |
| T5 | `api/domains/07-marketing-design-partners/m17-affiliates-influencers.md` | `display_commission` «15.00 ر.س» | «15 ر.س» — `format_money(commission_value, "SAR")` (`products/services/partners_service.py:86-89`) drops the decimals of a whole amount |
| T6 | `guides/console/16-platform-console/sharwa-pay-review.md`, `dues.md` | «محفظة التاجر» | «محفظة شروة باي للتاجر» — platform dues are collected from the store's Sharwa Pay wallet, not from «محفظة المتجر» |
| T6 | `guides/merchant/12-settings-staff-integrations/permissions-matrix.md` (2 places) | «طلبات الإتلاف» | «طلبات الإعدام» (the screen's word; the permission keeps its name «إتلاف مخزون») |
| UI term | `api/domains/08-finance/m14-payments-wallet.md` title, `api/domains/08-finance/README.md` | «المدفوعات ومحفظة التاجر» | «المدفوعات ومحفظة المتجر» |
| UI term | `api/domains/08-finance/m40-sharwa-pay.md` title, `api/domains/08-finance/README.md` | «محفظة شروة» | «محفظة شروة باي» |
| T8 | `api/integrators/webhooks-events.md` (4 payload examples) | `773514352` — a number copied from a code comment, not a fixture | `771234567` (the fixture number used across the docs) |
| T7 | 12 pages (§3) | `{#id}` | `<a id="id"></a>` |

Not changed, on purpose: `api/openapi/route-inventory.md` line 884 quotes «محفظة التاجر» from a Django docstring — the file is generated by `scripts/openapi/route_inventory.py` and follows the code. The Arabic names in the H1 of 28 API pages are page-scope titles (for example M03 is split into `m03-auth.md` «المصادقة وهيكل اللوحة» and `m03-overview.md`); the canonical module names stay in [glossary §4](glossary.md#4-modules-m01m49), which every page links.

## 5. Glossary reconciled with the UI labels

The glossary marked 64 table rows *(مقترح)* and asked Track 4 to check them. The Arabic guides glossary (DOC-284, now approved) recorded the label the screens actually show. Step 52 adopted it in [`glossary.md`](glossary.md) and added the legend **✓ (UI)**:

| English | Was *(مقترح)* | Now ✓ (UI) |
|---|---|---|
| Staff member | موظف | «موظف» · «الموظفون» |
| Custom role | دور مخصّص | «الأدوار المخصصة» |
| Personal access token | رمز وصول شخصي | «الرموز الشخصية» · «إنشاء رمز» |
| Customer wallet | محفظة العميل | «محفظة العميل» · «محافظ العملاء» |
| **Merchant wallet** | محفظة التاجر | **«محفظة المتجر»** |
| Approval request | طلب موافقة | «طلبات الموافقة المعلّقة» |
| Audit log | سجل التدقيق | «سجل التدقيق» |
| Financial / fulfilment status | حالة الطلب المالية / حالة التنفيذ | columns «المالية» / «التنفيذ» |
| Refund | الاسترداد | الاسترجاع — «سجل الاسترجاعات» |
| Return · RMA | طلب إرجاع · تصريح إرجاع | «المرتجعات» · «مسار RMA» |
| Quarantine | الحجر | «بانتظار الفحص» |
| Segment | الشريحة | «الشريحة» |
| Reservation | الحجز | حجز المخزون — «الحجوزات» (say which «حجز») |
| **Write-off** | الإتلاف | **«طلب إعدام» · «طلبات الإعدام»** (permission «إتلاف مخزون») |
| Multi-location mode | تعدد المواقع | «تعدد المواقع» |
| Routing rule | قاعدة التوجيه | «قواعد التوجيه» |
| **AWB queue** | طابور البوليصات | **«طابور AWB»** |
| **Courier shift** | الوردية | **«المناوبة»** («الوردية» is the POS shift) |
| **Zones · restricted · SLA** | المنطقة · منطقة محظورة · مدة التوصيل المتعهَّد بها | **«مناطق شروة شيب» · «النطاقات المحظورة» · «قواعد SLA»** |
| 3PL carrier | شركة الشحن | «شركات الشحن» · «الناقلون الخارجيون» |
| POS shift | الوردية | «الوردية» · «الورديات ودرج الكاش» |
| Sharwa Pay customer | عميل شروة باي | the UI names only the wallet: «محفظة شروة باي» |

Rows in **bold** changed the word, not just its status. The 43 rows still marked *(مقترح)* (two of them only partly) are architecture words with no screen (schema, BFF, idempotency key…) or labels not yet seen on a screen; they stay proposals.

## 6. Accepted exceptions (`_tools/allow.json`)

| Rule | Count | Why they are correct as written |
|---|---|---|
| T5 money | 14 | 9 quote a wrong format on purpose — 8 inside a discrepancy or «قيد معروف» note (constitution `1,250.00 ر.س`, mock `displayMoney()`, screenshots from fixtures) and 1 in the Step 52 changelog line that names the value it fixed; 4 are the M28 marketplace screens, which use their own `_money()` with two decimals (documented in [`architecture/40-money.md`](architecture/40-money.md)); 1 is a CSV row where the `1,` is the previous column |
| T3 permission-shaped | 2 | `inventory.export` and `inventory.writeoff_request` are audit action names, not permission keys |
| T2 module id | 1 | "«هجرة» M1 … M5" are the Phase A labels inside migrations `0211`–`0215` |
| T9 secret-like | 1 | `sk_live_9c41b2e07f2a` / `whsec_51d0aa93e6b4` are the fake values of `api/test_payments_api.py`, which asserts they never leak |
| T8 phone numbers | 49 | sequential or test numbers (`967771234567`, `967700000001`, `967770000011` …), the mock fixtures `967770841802` (DEMO_PHONE) and `967770000099` (RISKY_PHONE), the payout accounts `777410225` / `733902118` of `api/test_payments_api.py`, and `773514352`, quoted in [`architecture/61-phone-normalization.md`](architecture/61-phone-normalization.md) from the comment at `products/order_events.py:57` |

No secret, real customer name or real phone number was found.

## 7. A.13 fixes applied in code (DOC-535)

| Id | Fix | Files |
|---|---|---|
| KI-01 | `.env.example` sample `SHARWA_LIVE_MODULES` line lists all 39 keys of A.3 (adds `inventory`, `locations`, `returns`, `wallets`) and the comment block describes the five modules it lacked | `.env.example` |
| KI-02 | superseded BFF route removed: route + fixture deleted, the `accountStoreSchema` / `accountStoresSchema` / `AccountStore` exports and the now-unused `provisioningStatusSchema` import removed, the header comment updated, the README row removed | `git rm src/app/api/bff/account/stores/route.ts src/mocks/dashboard/stores.ts` · `src/features/dashboard-shell/schemas.ts` · `src/app/api/bff/README.md` |
| KI-03 | the re-audited table (DOC-463, [`architecture/23-ready-api-v1-audit.md`](architecture/23-ready-api-v1-audit.md) §6) replaces the old one; a «Changed by» column names the INT task per row | `specs/001-sharwa-frontend-platform/contracts/ready-api-v1.md` |

**Guard before committing** (no shell was available on the developer machine in this step): `npx tsc --noEmit` and `npm run lint` in `sharwa-frontend`. A search of `scripts/*.ts`, the shell components (`store-switcher.tsx`, `topbar.tsx`, `user-menu.tsx`, `store-context.tsx`, `api/session.ts`) and the BFF README found no other reference to the removed names; the type check covers the rest of `src/`.

## 8. Publishing decision (DOC-536)

Decided by fares on 2026-10-30 and recorded in [`README.md#maintenance`](README.md#maintenance): the docs live **in the repository** (`sharwa-frontend/docs/`) and are read on GitHub; a static site and an in-dashboard «مساعدة» link are later tasks. Consequences checked in this step:

- every internal link and anchor works with GitHub's slug rules (§3);
- the repository `falhomis-creator/sharwa-frontend` is **public** — the security findings in [`architecture/30-security.md`](architecture/30-security.md) §9 and [`architecture/90-open-items.md`](architecture/90-open-items.md) §C are therefore public too until the repository is made private (flagged in the README).

## 9. How to re-run

```bash
python docs/_tools/check_links.py [--list-pending]
python docs/_tools/check_terms.py
python docs/_tools/coverage.py --check
```

Each prints a one-line summary and exits `1` on any finding; the maintenance rule ([`README.md#maintenance`](README.md#maintenance)) runs all three before a documentation commit.

## 10. Related pages

- [`_coverage.md`](_coverage.md) · [`README.md`](README.md) · [`glossary.md`](glossary.md) · [`guides/_glossary.md`](guides/_glossary.md) · [`guides/_screenshots.md`](guides/_screenshots.md)
- [`architecture/92-inconsistencies.md`](architecture/92-inconsistencies.md) · [`architecture/20-bff.md`](architecture/20-bff.md)`#deprecated` · [`ops/environment.md`](ops/environment.md)`#live-modules`
