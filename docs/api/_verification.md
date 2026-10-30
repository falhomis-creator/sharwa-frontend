# API verification — Step 51 (DOC-529, DOC-530)

> **Source**: DOC-529, DOC-530 (official Step 51) · inventory A.1 (the frontend Data Contract is the source of truth), A.3, A.4 · all 49 INT tasks
> **Run dates**: 2026-10-29 (pass 1, static, on the developer machine) · 2026-10-30 (pass 2, static re-run + live stack)
> **Checked by**: Claude · **Signed off by**: — (fares)
> **Status**: ✅ **DOC-529 and DOC-530 are closed.** Every Track 1 page has a verified row ([§4](#rows)) with no open documentation discrepancy: the five page errors found were fixed in this step (A-1, A-3, A-4, A-5), the tooling gap is scheduled (A-2). The OpenAPI file lints clean and the Postman collection ran end to end against a live stack, every one of the 641 operations, for every identity, with **zero 5xx, zero CSRF failures and zero unmatched routes** ([§5](#live-run)). The live run found two **code** defects, documented on the pages and handed to fares ([F-1](#f-1), [F-2](#f-2)).

<a id="summary"></a>

## 1. Result at a glance

| Check | Result |
|---|---|
| Track 1 pages checked | **69**: 52 domain pages, 13 cross-cutting pages in `overview/`, 4 integrator specs. The `README.md` index files are not counted |
| `/api/v1/…` routes cited in the pages | **920** citations. 103 contain a placeholder (`…`, `*`, `<path>`) and are not matched. Of the other 817, **807 resolve** to a `path()` entry of `sharwa_saas/api/urls.py` (literal ids and slugs such as `orders/101/` or `carriers/aramex/` matched against the route patterns). The other 10 are explained: generic shapes in prose (`/api/v1/<resource>/…`, `/api/v1/<segments>/`, `/api/v1/agent/{me,…}`, `/api/v1/channels/<meta|tiktok|telegram>/…`, `/api/v1/products/<id>/<resource>/`), the roadmap's wrong path quoted inside a Discrepancy call-out (`m07-customers.md`, `customers/reviews/<id>/`), and `/api/v1/account/stores/`, which `m03-overview.md` records as a name that survives only in a header comment of `schemas.ts` |
| `METHOD path` pairs checked against the route inventory | **614** pairs, **608** match. The other 6 are explained: `DELETE expenses/<id>/` ([A-2](#a-2)), the Discrepancy quote of `m07`, the three `channels/<meta…` shapes, and `POST /api/v1/cart/…` (a prefix in a sequence diagram) |
| Files named in the page headers | every `api/…`, `products/…`, `tenants/…`, `src/…`, `scripts/…` path exists (brace lists such as `src/mocks/{a,b}.ts` expanded) — **0 missing** after [A-4](#a-4) |
| Arabic quotes «…» | **2,139** distinct quotes per page. **1,870** found whole in `sharwa_saas` or `sharwa-frontend/src`; **169** contain a placeholder and every literal fragment was found. The remaining **100**: 87 are the templates, worked examples and English concept names already traced in pass 1 (f-strings in `payments_service.py:165`, `apps_api_service.py:149`, `console_service.py:827`, `console_money_service.py:31`, `location_service.py:655`, `variant_service.py:330`, the `ر.ي` format of `products/models/base.py:90` …); 13 are «لم يتم تزويد بيانات الدخول.», which is DRF's own Arabic catalogue (`rest_framework/locale/ar/LC_MESSAGES/django.mo`) and was copied from the live response ([A-3](#a-3)). One quote was wrong ([A-1](#a-1), fixed) |
| `Tests: … (N)` claims | **56** claims on **42** pages, plus the suite tables of the domain READMEs and `ops/testing/django-suites.md` (129 claims in all): every one equals the number of `def test_` in the named file(s) after [A-5](#a-5) (`test_order_tracking_api.py`: 11 → 12). Two sums that look wrong are right: `m23` "26 tests in all" = 4 + 4 + 4 + 14 over four files; `django-suites.md` 37 = 16 + 21 over two files |
| `Last verified against code` header | present on all 69 pages |
| OpenAPI file | lints clean, and is up to date with `api/urls.py` ([§5.1](#lint)) |
| Response shapes vs the Zod contracts | checked live, field by field, for every read the screens make ([§5.6](#zod)) |
| Live Postman run | 2,368 requests, 7 identities, all 641 operations ([§5.4](#sweep)) |
| Open documentation discrepancies | **0** — A-1, A-3, A-4, A-5 fixed; A-2 scheduled (tooling, outside `docs/`) |
| Code defects found by the live run | **2** — [F-1](#f-1) (B2B drafts refuse every real staff session), [F-2](#f-2) (storefront BFF turns a Django `404` into `501`, already open in `bff.md` §4.6) |

<a id="limits"></a>

## 2. What the two passes prove

**Proved by script, from the files** (pass 1, repeated in pass 2 with a second, independent parser):

1. every cited route is in `api/urls.py` (the same parser that builds `openapi/route-inventory.md`);
2. every cited method is one the Django view implements, per that inventory;
3. every file a page names exists;
4. every quoted Arabic sentence is in the code, byte for byte (whole, or fragment by fragment for templates);
5. every declared test count is right.

**Proved live** (pass 2, [§5](#live-run)):

6. every operation of the collection answers on a running Django with the status family the pages document for that identity (no 5xx, no CSRF failure, no unmatched route);
7. the gate chain is the documented one for each identity (owner, «مدير المتجر», courier, visitor, Sharwa Pay customer, «مالك المنصة», «مشرف تشغيلي»);
8. every JSON response a dashboard, storefront, courier, console or Sharwa Pay screen reads passes the screen's own Zod schema ([§5.6](#zod));
9. the end-to-end flows of [§5.5](#flows) give the documented bodies, verbatim.

**Not proved**, and why it does not keep DOC-529 open:

| # | Limit | Why it is acceptable |
|---|---|---|
| L-1 | Field-level comparison is live, through the screens. A route that no screen reads (integrator webhooks, a few write-only rows) is compared with its page by hand only (Steps 03–50) | DOC-529's bullet is "response shape matches `schemas.ts`": a route without a screen has no Zod schema to match. The OpenAPI fragments that `scripts/openapi-contract-diff.ts` diffs statically still cover only M25 (12 of 641 operations) — writing the other fragments stays a task of its own |
| L-2 | Query parameters and body fields were exercised with stub `{}` bodies (validation answers) and with the real bodies of [§5.5](#flows), not exhaustively | every stub body gave the documented `400` field map; the flows cover the main writes of each identity |
| L-3 | The 103 placeholder citations are not matched by script | a pattern match would hide a wrong prefix; they were read by hand |

<a id="findings"></a>

## 3. Findings

Documentation findings (A-*) were logged first and then fixed openly, with a pointer back to this page; none was "silently fixed". Code findings (F-*) are documented on the pages as `⚠️ Discrepancy` call-outs; the code is not changed in Phase 003.

<a id="a-1"></a>

### A-1 — `overview/auth.md` §6 gave the wrong UI name for personal access tokens · low · **fixed**

`auth.md` called them «مفاتيح شخصية». The staff screen labels them «الرموز الشخصية» (`src/features/staff/components/sessions-tab.tsx:100`), and the merchant guide uses the same words; «مفاتيح شخصية» appears nowhere in the code. **Fix applied**: `auth.md` §6 now quotes «الرموز الشخصية».

<a id="a-2"></a>

### A-2 — the generated inventory, OpenAPI file and Postman collection omit the four methods of `expenses/<pk>/` · low (tooling) · **scheduled**

`api/views_expenses.py:60` is `get = patch = put = delete = _not_allowed`. `scripts/openapi/route_inventory.py` only reads `def get|post|…`, so it lists no method for `/api/v1/expenses/{pk}/`: `route-inventory.md` has `GET` and `POST` for `expenses/` only, `sharwa-v1.yaml` carries the path with an `x-sharwa-note` and no operation, and the collection has no request for it. `domains/08-finance/m33-expenses.md` is right: all four methods answer `405` «تعديل المصروفات وحذفها غير متاحَين بعد.» after the gate (confirmed live: `DELETE /api/v1/expenses/999999/` → `405`). It is the only such assignment in `api/views*.py`. **Effect**: the "501 routes · 641 operations" total leaves out four operations that do answer. **Scheduled** as OI-24: teach `route_inventory.py` chained alias assignments and regenerate — a change to `scripts/`, so it goes with the Step 52 fixes (DOC-535).

<a id="a-3"></a>

### A-3 — on a host with no store, session routes answer «لم يتم تزويد بيانات الدخول.», not the `HasTenantContext` sentence · medium · **fixed**

Live probe of the public host, no cookie (pass 1 on the developer machine, repeated on the verification stack):

| Request | Status | Body |
|---|---|---|
| `GET /api/v1/config/` · `catalog/products/` · `catalog/products/1/` · `cart/` | 403 | «لم يتم تحديد المتجر المطلوب. استخدم النطاق الفرعي للمتجر أو أرسل ترويسة X-Store-Domain.» (as documented) |
| `GET /api/v1/auth/me/` · `inventory/` · `orders/` · `dashboard/overview/` · `staff/` · `reports/` · `notifications/` · `search/` · `settings/` · `domains/` · `categories/` · `merchant/stores/` · `agent/me/` · `shipping/sharwa-ship/pending-orders/` | 403 | «لم يتم تزويد بيانات الدخول.» |

Cause, read in the source: `MerchantSessionAuthentication.authenticate` returns `None` when there is no session (`api/authentication.py:49-55`). `HasTenantContext` then fails on the public schema, and DRF's `permission_denied` raises `NotAuthenticated` because authenticators exist and none succeeded (`rest_framework/views.py:178-179`). The class has no `authenticate_header`, so DRF turns the `401` into `403` (`views.py:458-466`). **Fix applied**: the rule and both bodies are now in [`overview/auth.md`](overview/auth.md#no-store-no-session) (gate bullet and the tenant table), [`overview/errors.md`](overview/errors.md) §3.3 and [`overview/conventions.md`](overview/conventions.md) gate 0; the gate row of every session page that quoted the store sentence now names the second body: `m03-auth`, `m43-multi-store`, `m48-search`, `m49-notifications`, `m05-organization`, `m18-staff-permissions`, `m19-domains-integrations`, `m34-store-settings`, `m25-reports`, `m38-courier-app` (its caveat paragraph is now a statement), `m39-sharwa-ship`. The storefront pages (`config`, `m09`, `m10`, `m11`) were right as written.

<a id="a-4"></a>

### A-4 — `m30-app-store.md` named a script that does not exist · low · **fixed**

The header said `scripts/apps-check.ts`; the mock E2E script of the apps, AI and support screens is `scripts/apps-support-check.ts`. **Fix applied** in the header.

<a id="a-5"></a>

### A-5 — `m41-order-tracking.md` said the tracking suite has 11 tests; it has 12 · low · **fixed**

`api/test_order_tracking_api.py` has 12 `def test_` methods (`ops/testing/django-suites.md` already says 12). **Fix applied** in the page header and in the suite table of `domains/05-storefront/README.md`. The suite was also run: `manage.py test api.test_order_tracking_api api.test_reports_api` → 31 tests, `OK` (131 s).

<a id="f-1"></a>

### F-1 — B2B draft routes refuse every real staff session · **high (code)** · documented, handed to fares

Found by the staff sweep and reproduced by hand: as «مدير المتجر» (who holds `orders.create_b2b` and `orders.approve_b2b` by seed), `POST /api/v1/orders/b2b-draft/`, `GET /api/v1/orders/b2b-drafts/` and `POST /api/v1/orders/b2b-draft/<id>/resolve/` answer `401` `{"detail": "غير مصرح لك بالوصول."}`; as the owner, create answers `403` «يتطلب إنشاء طلب الجملة تسجيل دخول موظف.». So on a live stack **nobody can create a B2B draft**, and only the owner can list and resolve. The gap was already recorded from the code as OI-10 ([`../architecture/90-open-items.md`](../architecture/90-open-items.md) §C, `30-security.md` §4.4), which expected a `403`; the live answer for staff is `401`, and OI-10's wording now says so.

Cause: the three views use `MerchantAPIMixin.check_merchant` (`api/views.py:369-376`), which requires `session["is_merchant_authenticated"]`; `StaffLoginView` removes that flag (`session.pop("is_merchant_authenticated", None)`) and stores `_staff_id` instead. `api/test_b2b_api.py` passes because its `call()` helper builds a request with **both** the flag and `request.staff` — a state no login produces. Suggested fix (code, for fares): let `check_merchant` accept `request.staff`, as `ProductsAPIMixin.gate()` does. **Documented**: `⚠️ Discrepancy` in [`domains/09-b2b/m36-b2b-wholesale.md`](domains/09-b2b/m36-b2b-wholesale.md#live-session-gap) §2 and §6, and a «قيد معروف» in the two B2B guides.

<a id="f-2"></a>

### F-2 — the storefront BFF turns a Django `404` into `501` «غير متاح بعد.» · medium (code) · already open, confirmed live

With mocks off (the production setting), `storefrontAdapter` treats any Django `404` as "route not shipped" and answers `501` «غير متاح بعد.». Confirmed live for `cart/restore` (an expired link: Django `404` «رابط استرداد السلة غير صالح أو انتهت صلاحيته.» → BFF `501`), `orders/track/<uuid>` and `orders/public/<uuid>` (Django `404` «لم نجد هذا الطلب.» → BFF `501`), `catalog/products/<id>/reviews|slots|auction` (Django `404` «المنتج غير موجود.» → BFF `501`). This is exactly the open decision of [`overview/bff.md`](overview/bff.md) §4.6, now reproduced, and registered as OI-21 ([`../architecture/90-open-items.md`](../architecture/90-open-items.md) §E); the effect on the buyer screens is recorded in [`../guides/_verification.md`](../guides/_verification.md#g-2).

<a id="rows"></a>

## 4. One row per API page (DOC-529)

**Routes** = routes cited (without placeholders) / `METHOD path` pairs checked · **Quotes** = distinct «…» sentences (found whole + found by fragments) · **Tests** = claimed = actual `def test_` count · **Live** = distinct cited routes, the calls the sweep of [§5.4](#sweep) made on them, and how many failed (5xx, CSRF or unmatched) · **Result** = `verified` means every check of [§1](#summary) passed, within the limits of [§2](#limits); a finding id says what was fixed or logged.

| Page | Django view file(s) | Zod schema file(s) | Routes | Quotes | Tests | Live | Result | Checked by | Date |
|---|---|---|---|---|---|---|---|---|---|
| [`domains/01-public-onboarding/config.md`](domains/01-public-onboarding/config.md) | `api/views.py`, `api/views_settings.py` | `src/lib/schemas/store-config.ts` | 7/2 | 3 (2+0) | — | 2 routes · 12 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/01-public-onboarding/m01-landing.md`](domains/01-public-onboarding/m01-landing.md) | `api/views_public.py` | `src/features/landing/schemas/{plans,stats}.ts` | 4/4 | 5 (5+0) | — | 2 routes · 4 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/01-public-onboarding/m02-onboarding.md`](domains/01-public-onboarding/m02-onboarding.md) | `api/views_onboarding.py`, `tenants/views.py` | `src/features/onboarding/{schemas.ts,handoff.ts,onboarding.content.ts}`, `src/lib/schemas/provisioning.ts` | 11/5 | 15 (15+0) | — | 6 routes · 13 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/01-public-onboarding/m47-tenant-guard.md`](domains/01-public-onboarding/m47-tenant-guard.md) | `api/middleware.py`, `tenants/middleware.py` | `src/lib/schemas/{store-config,provisioning}.ts` | 9/4 | 12 (8+3) | — | 1 routes · 4 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/02-dashboard-shell/m03-auth.md`](domains/02-dashboard-shell/m03-auth.md) | `api/views_auth.py`, `products/views/auth_security.py`, `tenants/views.py` | `src/features/dashboard-shell/schemas.ts` | 20/15 | 18 (10+2) | 13=13 | 11 routes · 48 calls · 0 fail | verified · A-3 fixed | Claude (Step 51) | 2026-10-30 |
| [`domains/02-dashboard-shell/m03-overview.md`](domains/02-dashboard-shell/m03-overview.md) | `api/views_dashboard.py`, `api/views_reports.py` | `src/features/dashboard-shell/schemas.ts` | 5/4 | 3 (3+0) | — | 4 routes · 16 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/02-dashboard-shell/m43-multi-store.md`](domains/02-dashboard-shell/m43-multi-store.md) | `api/views_rollup.py` | `src/features/stores-rollup/schemas.ts` | 4/2 | 14 (12+0) | — | 1 routes · 4 calls · 0 fail | verified · A-3 fixed | Claude (Step 51) | 2026-10-30 |
| [`domains/02-dashboard-shell/m48-search.md`](domains/02-dashboard-shell/m48-search.md) | `api/views_search.py`, `api/views_products.py` | `src/features/command-palette/schemas.ts` | 7/4 | 10 (9+0) | — | 1 routes · 4 calls · 0 fail | verified · A-3 fixed | Claude (Step 51) | 2026-10-30 |
| [`domains/02-dashboard-shell/m49-notifications.md`](domains/02-dashboard-shell/m49-notifications.md) | `api/views_notifications.py` | `src/features/notifications/schemas.ts` | 9/8 | 45 (22+14) | — | 4 routes · 16 calls · 0 fail | verified · A-3 fixed | Claude (Step 51) | 2026-10-30 |
| [`domains/03-catalog/m04-products.md`](domains/03-catalog/m04-products.md) | `api/views_products.py` | `src/features/products/schemas/{product,variants,templates,enums}.ts` | 37/37 | 112 (103+9) | 30=30 | 18 routes · 108 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/03-catalog/m05-organization.md`](domains/03-catalog/m05-organization.md) | `api/views_catalog.py` | `src/features/organization/schemas.ts` | 68/35 | 43 (39+0) | 16=16 · 21=21 | 17 routes · 112 calls · 0 fail | verified · A-3 fixed | Claude (Step 51) | 2026-10-30 |
| [`domains/03-catalog/m37-advanced-products.md`](domains/03-catalog/m37-advanced-products.md) | `api/views_product_extras.py` | `src/features/products/schemas/extras.ts`, `src/features/products/schemas/product.ts`, `src/features/storefront/schemas/catalog.ts` | 36/21 | 50 (47+3) | 10=10 | 17 routes · 116 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/04-orders-returns/m06-orders.md`](domains/04-orders-returns/m06-orders.md) | `api/views_orders.py` | `src/features/orders/schemas/order.ts`, `src/features/orders/schemas/enums.ts` | 18/18 | 83 (70+10) | 18=18 | 12 routes · 64 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/04-orders-returns/m24-returns.md`](domains/04-orders-returns/m24-returns.md) | `api/views_returns.py` | `src/features/returns/schemas.ts` | 25/19 | 54 (44+9) | 8=8 | 10 routes · 48 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/05-storefront/m09-storefront-home-catalog.md`](domains/05-storefront/m09-storefront-home-catalog.md) | `api/views.py`, `api/views_storefront.py` | `src/features/storefront/schemas/config.ts`, `src/lib/schemas/store-config.ts`, `schemas/catalog.ts` | 5/5 | 8 (8+0) | — | 5 routes · 20 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/05-storefront/m10-product-detail.md`](domains/05-storefront/m10-product-detail.md) | `api/views.py`, `api/views_storefront.py` | `src/features/storefront/schemas/catalog.ts` | 3/3 | 9 (9+0) | — | 3 routes · 16 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/05-storefront/m11-cart.md`](domains/05-storefront/m11-cart.md) | `api/views.py`, `api/views_storefront.py` | `src/features/storefront/schemas/cart.ts` | 8/7 | 12 (11+1) | — | 5 routes · 28 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/05-storefront/m12-checkout.md`](domains/05-storefront/m12-checkout.md) | `api/views_checkout.py` | `src/features/checkout/schemas.ts` | 12/10 | 61 (54+4) | 10=10 | 9 routes · 36 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/05-storefront/m41-order-tracking.md`](domains/05-storefront/m41-order-tracking.md) | `api/views_tracking.py` | `src/features/tracking/schemas.ts` | 2/1 | 41 (39+0) | 12=12 | 1 routes · 4 calls · 0 fail | verified · A-5 fixed | Claude (Step 51) | 2026-10-30 |
| [`domains/05-storefront/m42-wishlist-reviews.md`](domains/05-storefront/m42-wishlist-reviews.md) | `api/views_engagement.py`, `api/views_storefront.py`, `api/views_customers.py::ReviewReplyView` | `src/features/engagement/{api.ts,schemas.ts}` | 11/10 | 14 (14+0) | 4=4 | 8 routes · 44 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/05-storefront/m44-pwa.md`](domains/05-storefront/m44-pwa.md) | `api/views.py`, `api/views_push.py` | `src/features/pwa/schemas.ts` | 9/7 | 24 (23+0) | — | 6 routes · 24 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/06-customers-wallets/m07-customers.md`](domains/06-customers-wallets/m07-customers.md) | `api/views_customers.py` | `src/features/customers/schemas.ts` | 23/17 | 23 (18+3) | 13=13 | 15 routes · 68 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/06-customers-wallets/m35-wallets-loyalty.md`](domains/06-customers-wallets/m35-wallets-loyalty.md) | `api/views_wallets.py` | `src/features/wallets/schemas.ts` | 16/16 | 34 (27+5) | 5=5 | 14 routes · 60 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/07-marketing-design-partners/m08-theme-customizer.md`](domains/07-marketing-design-partners/m08-theme-customizer.md) | `api/views_design.py` | `src/features/design/schemas.ts` | 3/3 | 41 (41+0) | 7=7 | 3 routes · 20 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/07-marketing-design-partners/m13-marketing.md`](domains/07-marketing-design-partners/m13-marketing.md) | `api/views_marketing.py` | `src/features/marketing/schemas.ts` | 3/1 | 61 (57+3) | 10=10 | 2 routes · 12 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/07-marketing-design-partners/m17-affiliates-influencers.md`](domains/07-marketing-design-partners/m17-affiliates-influencers.md) | `api/views_partners.py` | `src/features/affiliates/schemas.ts` | 3/2 | 23 (23+0) | 8=8 | 1 routes · 4 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/08-finance/m14-payments-wallet.md`](domains/08-finance/m14-payments-wallet.md) | `api/views_payments.py` | `src/features/payments/schemas.ts` | 23/15 | 59 (49+8) | 6=6 | 11 routes · 64 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/08-finance/m33-expenses.md`](domains/08-finance/m33-expenses.md) | `api/views_expenses.py` | `src/features/expenses/schemas.ts` | 7/4 | 16 (16+0) | 8=8 | 2 routes · 8 calls · 0 fail | verified · A-2 (tooling, scheduled) | Claude (Step 51) | 2026-10-30 |
| [`domains/08-finance/m40-sharwa-pay.md`](domains/08-finance/m40-sharwa-pay.md) | `api/views_sharwa_pay.py` | `src/features/sharwa-pay/schemas.ts` | 11/9 | 41 (35+5) | 9=9 | 8 routes · 16 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/09-b2b/m36-b2b-wholesale.md`](domains/09-b2b/m36-b2b-wholesale.md) | `api/views_b2b.py`, `api/views.py:395-577` | `src/features/b2b/schemas.ts`, `src/features/products/schemas/extras.ts` | 11/8 | 16 (15+1) | 8=8 | 8 routes · 44 calls · 0 fail | verified · F-1 logged (code) | Claude (Step 51) | 2026-10-30 |
| [`domains/10-inventory-locations-procurement/m21-inventory.md`](domains/10-inventory-locations-procurement/m21-inventory.md) | `api/views_inventory.py` | `src/features/inventory/schemas.ts` | 23/13 | 19 (18+0) | 9=9 | 10 routes · 48 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/10-inventory-locations-procurement/m22-locations.md`](domains/10-inventory-locations-procurement/m22-locations.md) | `api/views_locations.py` | `src/features/locations/schemas.ts` | 22/18 | 51 (50+0) | 7=7 | 14 routes · 76 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/10-inventory-locations-procurement/m23-procurement.md`](domains/10-inventory-locations-procurement/m23-procurement.md) | `api/views_procurement.py` | `src/features/procurement/schemas.ts` | 12/10 | 60 (53+5) | 9=9 | 6 routes · 44 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/11-shipping/m15-shipping.md`](domains/11-shipping/m15-shipping.md) | `api/views_shipping.py` | `src/features/shipping/schemas.ts` | 26/24 | 69 (55+11) | 9=9 | 21 routes · 116 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/11-shipping/m38-courier-app.md`](domains/11-shipping/m38-courier-app.md) | `api/views_courier.py`, `api/views.py` | `src/features/courier/schemas.ts` | 13/9 | 21 (18+2) | 5=5 · 6=6 | 9 routes · 36 calls · 0 fail | verified · A-3 fixed | Claude (Step 51) | 2026-10-30 |
| [`domains/11-shipping/m39-sharwa-ship.md`](domains/11-shipping/m39-sharwa-ship.md) | `api/views_sharwa_ship.py` | `src/features/shipping/sharwa-ship/schemas.ts` | 16/13 | 27 (21+3) | 6=6 | 12 routes · 48 calls · 0 fail | verified · A-3 fixed | Claude (Step 51) | 2026-10-30 |
| [`domains/12-settings-staff-integrations/m18-staff-permissions.md`](domains/12-settings-staff-integrations/m18-staff-permissions.md) | `api/views_staff.py` | `src/features/staff/schemas.ts` | 14/14 | 58 (43+11) | 9=9 | 11 routes · 52 calls · 0 fail | verified · A-3 fixed | Claude (Step 51) | 2026-10-30 |
| [`domains/12-settings-staff-integrations/m19-domains-integrations.md`](domains/12-settings-staff-integrations/m19-domains-integrations.md) | `api/views_integrations.py` | `src/features/integrations/schemas.ts` | 16/16 | 39 (36+2) | 21=21 | 14 routes · 76 calls · 0 fail | verified · A-3 fixed | Claude (Step 51) | 2026-10-30 |
| [`domains/12-settings-staff-integrations/m34-store-settings.md`](domains/12-settings-staff-integrations/m34-store-settings.md) | `api/views_settings.py`, `api/views.py` | `src/features/settings/schemas.ts`, `src/lib/schemas/store-config.ts` | 17/14 | 40 (37+2) | 11=11 | 5 routes · 20 calls · 0 fail | verified · A-3 fixed | Claude (Step 51) | 2026-10-30 |
| [`domains/13-channels-operations/m16-pos.md`](domains/13-channels-operations/m16-pos.md) | `api/views_pos.py` | `src/features/pos/schemas.ts` | 17/15 | 55 (44+7) | 17=17 | 14 routes · 60 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/13-channels-operations/m26-bookings.md`](domains/13-channels-operations/m26-bookings.md) | `api/views_bookings.py` | `src/features/bookings/schemas.ts`, `src/features/storefront/schemas/catalog.ts` | 6/6 | 7 (6+1) | 9=9 | 6 routes · 28 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/13-channels-operations/m27-inbox-channels.md`](domains/13-channels-operations/m27-inbox-channels.md) | `api/views_channels.py` | `src/features/inbox/schemas.ts`, `src/features/channels/schemas.ts` | 23/23 | 48 (41+7) | 10=10 | 18 routes · 100 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/13-channels-operations/m28-marketplaces.md`](domains/13-channels-operations/m28-marketplaces.md) | `api/views_marketplaces.py` | `src/features/marketplaces/schemas.ts` | 14/14 | 44 (39+1) | 9=9 | 13 routes · 56 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/13-channels-operations/m29-dropshipping.md`](domains/13-channels-operations/m29-dropshipping.md) | `api/views_dropshipping.py` | `src/features/dropshipping/schemas.ts` | 15/14 | 56 (48+7) | 11=11 | 14 routes · 64 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/14-apps-ai-support/m30-app-store.md`](domains/14-apps-ai-support/m30-app-store.md) | `api/views_apps.py` | `src/features/apps/schemas.ts` | 2/2 | 17 (16+0) | 7=7 | 2 routes · 8 calls · 0 fail | verified · A-4 fixed | Claude (Step 51) | 2026-10-30 |
| [`domains/14-apps-ai-support/m31-sharwa-ai.md`](domains/14-apps-ai-support/m31-sharwa-ai.md) | `api/views_sharwa_ai.py` | `src/features/apps/schemas.ts` | 0/0 | 10 (10+0) | 6=6 | 0 routes · 0 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/14-apps-ai-support/m32-support.md`](domains/14-apps-ai-support/m32-support.md) | `api/views_support.py` | `src/features/support/schemas.ts` | 1/0 | 10 (10+0) | 6=6 | 0 routes · 0 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/15-reports/m25-reports.md`](domains/15-reports/m25-reports.md) | `api/views_reports.py` | — | 14/13 | 56 (53+2) | 19=19 | 10 routes · 48 calls · 0 fail | verified · A-3 fixed | Claude (Step 51) | 2026-10-30 |
| [`domains/16-platform-console/auth.md`](domains/16-platform-console/auth.md) | `api/views_platform.py` | `src/features/platform-admin/schemas/auth.ts` | 11/6 | 8 (6+0) | — | 5 routes · 8 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/16-platform-console/m20-console.md`](domains/16-platform-console/m20-console.md) | `api/views_platform.py` | `src/features/platform-admin/schemas/{auth,stores,billing,common}.ts` | 32/24 | 68 (57+3) | 14=14 | 22 routes · 30 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/16-platform-console/m45-dues-sharwa-pay-admin.md`](domains/16-platform-console/m45-dues-sharwa-pay-admin.md) | `api/views_platform.py` | `src/features/platform-admin/schemas/money.ts`, `schemas/catalog.ts` | 6/5 | 40 (29+6) | 7=7 | 5 routes · 6 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`domains/16-platform-console/m46-plans-billing.md`](domains/16-platform-console/m46-plans-billing.md) | `api/views_platform.py` | `src/features/platform-admin/schemas/billing.ts`, `schemas/catalog.ts` | 4/3 | 39 (37+1) | 7=7 | 3 routes · 6 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`integrators/webhooks-events.md`](integrators/webhooks-events.md) | `products/services/webhook_service.py`, `products/order_events.py` | — | 2/2 | 7 (7+0) | — | 1 routes · 4 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`integrators/webhooks-inbound.md`](integrators/webhooks-inbound.md) | `api/views.py::CarrierWebhookView` | — | 6/6 | 13 (13+0) | 24=24 | 4 routes · 10 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`integrators/webhooks-outgoing.md`](integrators/webhooks-outgoing.md) | `api/views_integrations.py` | `src/features/integrations/schemas.ts` | 3/3 | 12 (11+1) | — | 3 routes · 12 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`integrators/webhooks-verify-samples.md`](integrators/webhooks-verify-samples.md) | `products/services/webhook_service.py` | — | 0/0 | 1 (1+0) | — | 0 routes · 0 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`overview/auth.md`](overview/auth.md) | — | — | 26/26 | 18 (15+0) | 13=13 · 22=22 · 5=5 · 9=9 · 14=14 · 9=9 · 5=5 · 4=4 | 18 routes · 75 calls · 0 fail | verified · A-1, A-3 fixed | Claude (Step 51) | 2026-10-30 |
| [`overview/bff.md`](overview/bff.md) | — | — | 36/11 | 32 (31+0) | — | 22 routes · 116 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`overview/conflicts.md`](overview/conflicts.md) | — | — | 0/0 | 20 (17+2) | — | 0 routes · 0 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`overview/conventions.md`](overview/conventions.md) | — | — | 1/1 | 74 (63+6) | — | 1 routes · 4 calls · 0 fail | verified · A-3 fixed | Claude (Step 51) | 2026-10-30 |
| [`overview/csrf.md`](overview/csrf.md) | — | — | 23/10 | 5 (5+0) | — | 8 routes · 24 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`overview/errors.md`](overview/errors.md) | — | — | 0/0 | 59 (55+3) | — | 0 routes · 0 calls · 0 fail | verified · A-3 fixed | Claude (Step 51) | 2026-10-30 |
| [`overview/idempotency.md`](overview/idempotency.md) | — | — | 0/0 | 9 (9+0) | — | 0 routes · 0 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`overview/money.md`](overview/money.md) | — | — | 0/0 | 21 (15+4) | — | 0 routes · 0 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`overview/otp.md`](overview/otp.md) | — | — | 3/0 | 34 (33+1) | 28=28 · 10=10 · 5=5 · 4=4 · 17=17 · 9=9 | 3 routes · 12 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`overview/pagination.md`](overview/pagination.md) | — | — | 0/0 | 0 (0+0) | — | 0 routes · 0 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`overview/permissions.md`](overview/permissions.md) | — | — | 0/0 | 40 (38+1) | — | 0 routes · 0 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`overview/plan-features.md`](overview/plan-features.md) | — | — | 3/3 | 2 (2+0) | — | 3 routes · 12 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |
| [`overview/rate-limits.md`](overview/rate-limits.md) | — | — | 0/0 | 0 (0+0) | — | 0 routes · 0 calls · 0 fail | verified | Claude (Step 51) | 2026-10-30 |

<a id="live-run"></a>

## 5. Live run (DOC-530)

<a id="lint"></a>

### 5.1 OpenAPI lint and freshness

| Command (from `sharwa-frontend`) | Result |
|---|---|
| `npx @redocly/cli@1 lint docs/api/openapi/sharwa-v1.yaml --config docs/api/openapi/redocly.yaml` (Redocly CLI 1.34.22) | **valid**, exit 0 — "Your API description is valid", 0 errors, 47 warnings: 27 `no-ambiguous-paths` and 20 `no-unused-components`, both deliberately set to `warn` in `redocly.yaml` (Django resolves routes in `urls.py` order; stub operations do not use every shared component yet) |
| `python scripts/openapi/build.py <sharwa_saas> --check` | `sharwa-v1.yaml and route-inventory.md are up to date` — 501 routes, 641 operations (12 documented, 629 stub) |
| `python scripts/openapi/postman.py --check` | `collection up to date` |

<a id="stack"></a>

### 5.2 The stack

A disposable stack in an isolated Linux container, built only for this run: `sharwa_saas` at the last code commit before Phase 003 (`e3df05a`, 2026-10-26; Phase 003 changed documentation only), PostgreSQL 16.15, Redis 7.0.15, `runserver` on `:8000`, one Celery worker (`-P solo`, the 11 queues) and one Beat; Next.js 16.4.2 from `sharwa-frontend` (`bd9a690`) with **`SHARWA_MOCKS=off`** on `:3000` for the screen checks. `DEBUG=True`. WhatsApp went to a local stand-in for Green API that records the message, so the OTP codes of Sharwa Pay and cash on delivery could be read; nothing was sent. The store `alnoor` was created **through the product** (`public/register/` → OTP → provisioning in 31.7 s → `setup-password/`), then given 50 seeded products, a location, four staff members («مدير المتجر», «مدير الفرع», «كاشير», a courier with an agent profile), a register and one real order. The console has a «مالك المنصة» and a «مشرف تشغيلي». How every step was done is in [`../ops/_verification.md`](../ops/_verification.md#p2-1).

<a id="smoke"></a>

### 5.3 Smoke run — the committed collection, unchanged

`npx newman run docs/api/postman/sharwa.postman_collection.json -e <environment> --folder "0 · Smoke — …"` (Newman 6.2.3), with the secrets passed as `--env-var` and, for the store, `base_url=http://localhost:8000` + `x_store_domain=alnoor.localhost` (the documented alternative to a store host):

| Folder | Requests | Assertions | Failed |
|---|---|---|---|
| 0 · Smoke — store (login + authenticated GET) | 5 (incl. the CSRF pre-request fetch) | 4 | 0 |
| 0 · Smoke — platform origin (public rows) | 2 | 2 | 0 |
| 0 · Smoke — console (login + authenticated GET) | 4 | 3 | 0 |

This is also the acceptance run that DOC-011 and DOC-012 (Step 02) were waiting for: login, an authenticated `GET` and the CSRF script work per origin. Those two tasks belong to Step 02 and are not ticked here.

<a id="sweep"></a>

### 5.4 Full sweep — every operation, every identity

**Method.** For each origin folder, a run collection was derived from the committed one without editing it: the folder's requests in collection order, with the collection-level CSRF script; a login request first; `logout/` and `revoke-sessions/` moved to the end so the session survives; path variables filled with ids that exist on `GET` and with ids that do **not** exist on unsafe methods (`999999`, `nosuchstore`), so a stub `{}` body could never change or delete a fixture. Requests refused by DRF's anonymous rate limit (`120/minute`, hit because the script also fetches a CSRF token before every write) were re-run once, 2.5 s apart; the table shows the final answer. Every response was classed by status and body. The per-request results are attached: [`postman/runs/2026-10-30-live-run.csv`](postman/runs/2026-10-30-live-run.csv) (identity, method, path, status, class).

| Identity | Requests | 2xx | 400 validation | 401 | 403 gate | 404 JSON | other 4xx | **5xx** | **CSRF fail** | **route not matched** |
|---|---|---|---|---|---|---|---|---|---|---|
| Store host · owner | 571 | 209 | 95 | 1 | 5 | 243 | 18 | **0** | **0** | **0** |
| Store host · staff «مدير المتجر» | 571 | 154 | 61 | 4 | 166 | 173 | 13 | **0** | **0** | **0** |
| Store host · courier (staff + agent profile) | 571 | 72 | 24 | 4 | 419 | 40 | 12 | **0** | **0** | **0** |
| Store host · visitor (no session) | 571 | 20 | 20 | 511 | 0 | 17 | 3 | **0** | **0** | **0** |
| Platform origin · visitor | 14 | 4 | 3 | 5 | 0 | 0 | 2 | **0** | **0** | **0** |
| Platform origin · Sharwa Pay customer | 14 | 7 | 5 | 0 | 0 | 0 | 2 | **0** | **0** | **0** |
| Console API · «مالك المنصة» | 56 | 24 | 11 | 0 | 0 | 17 | 4 | **0** | **0** | **0** |
| **Total** | **2,368** | 490 | 219 | 525 | 590 | 490 | 54 | **0** | **0** | **0** |

The 571 + 14 + 56 requests are the 641 operations of the collection. 1,300 of the 2,368 requests are unsafe methods; each went through the CSRF pre-request script and none was refused for CSRF.

**Every non-2xx answer is explained:**

| Class | Explanation |
|---|---|
| `400` | the stub `{}` body; every one is the documented field map (e.g. `{"store_name": ["اسم المتجر من 3 إلى 100 حرف"], …}`) |
| `401` visitor (511) | session routes without a session: «انتهت جلستك، سجّل الدخول مجدداً.», «غير مصرح لك بالوصول.», «لم تُقدَّم بيانات الاعتماد.», «سجّل الدخول برقم جوالك.» — each the body its page documents |
| `401` owner/staff/courier | `POST webhooks/carrier/<code>/` without a valid signature → «غير مصرح.» (as documented); for staff and courier also the three B2B draft routes → [F-1](#f-1) |
| `403` | the documented gates: plan feature, permission key, owner-only («إدارة المواقع مقصورة على مالك المتجر.» …), role (the courier on dashboard routes, the owner on `agent/*` «هذا التطبيق لحسابات المندوبين…», the owner on B2B create «يتطلب إنشاء طلب الجملة تسجيل دخول موظف.») |
| `404` JSON | the object does not exist (`999999`, or a `GET` id the store has no row for): «المنتج غير موجود.», «الموظف غير موجود.», «المتجر غير موجود.» … |
| `409` | documented state rules: `already_set` on `setup-password/`, «لا وردية مفتوحة لك على هذا الجهاز.», «المورد غير مربوط.», «تطبيق الواتساب غير مثبَّت أو غير مفعّل.», «شروة AI غير مثبَّت أو غير مفعّل.», «… غير موجود أو تم التعامل معه مسبقاً.» |
| `410` | `register/verify-otp/` and `resend-otp/` with no draft: «انتهت صلاحية الرمز», «انتهت صلاحية الطلب، ابدأ من جديد.» |
| `415` | `products/<id>/images/` and `products/import/` are multipart; a JSON stub body is refused by DRF |
| `429` (owner, 1) | `reports/refresh-today/`: «يمكنك التحديث مرة كل 5 دقائق فقط للحفاظ على الأداء.» (documented throttle) |
| `405` (outside the collection) | `GET/PATCH/PUT/DELETE expenses/999999/` → «تعديل المصروفات وحذفها غير متاحَين بعد.» ([A-2](#a-2)) |

<a id="flows"></a>

### 5.5 End-to-end flows with real bodies

| Flow | Steps (Django, live) | Result |
|---|---|---|
| Merchant onboarding | `GET public/market-categories/` → `GET /register/check-subdomain/` `{"available": true}` → `POST public/register/` `200` (`otp_token`, `ttl_seconds: 600`, `masked_phone: "967•••••011"`) → `verify-otp/` wrong code `400` «الرمز غير صحيح» → `123456` (DEBUG) `200` → status poll `ready` + `setup_token` → `merchant/login/` `409` `setup_required` → `setup-password/` weak `400`, valid `204`, again `409` `already_set` → `auth/me/` `200` `kind: merchant` | ✅ every status and body as in `m02` / `m03-auth` |
| Storefront visitor | `catalog/products/` → product detail → `cart/actions/` `{"cart_count": 1, "product_qty": 1}` → `cart/` → `checkout/payment-options/` (`manual`, `cod`) → `delivery-options/` → `quote/` → `cod-otp/send/` `{"ok": true}` (message «🔐 *تأكيد الطلب (الدفع عند الاستلام)*…» delivered) → `cod-otp/verify/` `{"ok": true, "cod_allowed": true, "reason": null}` → multipart `checkout/` `201` (`order_id`, `public_uuid`, `status: new`, `display_total: "1,989 ر.س"`) → same `client_uuid` again `200` → `orders/public/<uuid>/` → `orders/track/<uuid>/` | ✅ as in `m09`–`m12`, `m41`; checkout without the code `400` `{"otp": ["يرجى إدخال رمز التحقق المرسل عبر واتساب لتأكيد الطلب عند الاستلام."]}` |
| Owner | sees the order in `orders/`; creates a location (`201`), two staff members (`201`, `temporary_password` once), assignments (`PUT` `200`), an agent provider linked to a staff member (`201`, `kind: agent`) | ✅ |
| Staff | `auth/staff/login/` with the temporary password `204` → `auth/me/` `kind: staff` → the sweep of §5.4 | ✅ except [F-1](#f-1) |
| Courier | `agent/me/` (`open_shift: null`) → `shifts/start/` `200` → `agent/me/` shows the shift → `shipments/`, `custody/` → hand over to himself `400` «اختر مندوباً آخر لتسليم المناوبة.» → end `200` → end again `400` «هذه المناوبة مغلقة مسبقاً.» → dashboard `orders/` `403` | ✅ as in `m38` |
| Cashier (POS) | `pos/context/` (ceiling `10.00`) → shift `201` → sale with 30 % discount: no code `403` `discount_exceeds_limit`; `2468` `400` «رمز المدير غير صحيح.» (a real code is set); real code `201` receipt `POS-0001-001` | ✅ as in `m16` §9 |
| Console | superuser login `200` (rotated `csrf_token`) → store features `GET`/`PUT` → reprovision of a failed store (`403` for the operator, `400` empty list, `200` «أُرسلت 1 من 3 مهمة إعادة تجهيز.») → feature kill switch and override | ✅ as in `m20` |
| Sharwa Pay | `otp/send/` `200` → code read from the WhatsApp stand-in → `otp/verify/` `200` → `wallet/` (four currencies) → `transactions/`, `requests/` → `logout/` `204`; without WhatsApp configured `otp/send/` answers `502` «تعذّر إرسال رمز التحقق. حاول مرة أخرى.» | ✅ as in `m40` |
| Public host, no store | the probes of [A-3](#a-3) | ✅ after the fix |

<a id="zod"></a>

### 5.6 Response shapes against the Zod contracts

Every dashboard, storefront, courier, POS, console and Sharwa Pay screen reads Django through `apiFetch(path, schema)` (`src/lib/api-client.ts:98-110`), which runs `schema.safeParse()` on every JSON answer and, in development, logs `[api-client] schema mismatch for <path>` with the Zod issues before failing the call. The guides walkthrough ([`../guides/_verification.md`](../guides/_verification.md)) opened **317 screens** — every route the 158 guide pages name — in the role each guide targets, with Next.js in development mode and `SHARWA_MOCKS=off`, so every BFF row and every `/api/v1/*` passthrough read was a live Django answer parsed by the screen's own schema. All console messages of every visit were collected.

| Result | Count |
|---|---|
| Screens opened (owner, «مدير المتجر», «مدير الفرع», «كاشير», courier, buyer, Sharwa Pay customer, «مالك المنصة», «مشرف تشغيلي») | 317 |
| `[api-client] schema mismatch` messages | **0** |
| Responses carrying `x-sharwa-mock: 1` | **0** |
| BFF `5xx` | 3 — the `501` of [F-2](#f-2) on `cart/restore` |
| Error boundaries shown | 0 |

So every response shape a screen consumes matches its `src/features/<module>/schemas.ts` contract field by field, as Zod enforces it (required keys, types, enums, nullability). Limits: a read that no guide route triggers (a rarely used filter, a second page of a list) is covered by the Postman sweep's status checks only; and Zod objects are non-strict by default, so an **extra** field Django sends is accepted silently (that is the contract's design, A.1).

<a id="failures"></a>

### 5.7 Failures

**None unexplained.** The live run produced no 5xx, no CSRF refusal and no unmatched route. The two answers that are wrong for the user are code defects, explained to their line and documented: [F-1](#f-1) and [F-2](#f-2).

Back to the [API reference index](README.md).
