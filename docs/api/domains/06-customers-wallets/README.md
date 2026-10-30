# Customers, customer wallets & loyalty — العملاء ومحافظ العملاء والولاء

> Domain 06 — modules M07, M35. **Source**: DOC-124 (Step 20) · INT-017 (M07), INT-028 (M35) · inventory Domain 6 + A.11
> **Last verified against code**: 2026-10-27 (step 20)

Sharwa has **no tenant `Customer` model**. A customer is *derived*: a normalized phone number (the *customer key*) that appears on at least one placed order. Everything else that belongs to a person — wallet, loyalty points, COD reliability, wishlist, back-in-stock alerts, abandoned carts, reviews, internal notes — is stored against a phone and joined to the order history by that same key. This page explains the key and the rules shared by both modules; the endpoints are on the two module pages.

## Pages

| Page | DOC | What it documents |
|---|---|---|
| This page | DOC-124 | The derived customer model, the SAR wallet ledger, trust separation, the route map of the domain |
| [`m07-customers.md`](m07-customers.md) | DOC-125 → DOC-131 | List, segment count, CSV export, profile + trust, profile tabs, notes, COD decision |
| [`m35-wallets-loyalty.md`](m35-wallets-loyalty.md) | DOC-132 → DOC-136 | Merchant wallets, top-up, loyalty reads, storefront wallet/loyalty rows, checkout redemption sequence |

## 1. The two integrations at a glance

| | INT-017 — M07 Customers | INT-028 — M35 Customer Wallets & Loyalty Points |
|---|---|---|
| Live key (`SHARWA_LIVE_MODULES`) | `customers` | `wallets` for the **7 merchant rows** · *none* for the 5 storefront rows (Django-first through `storefrontAdapter`) |
| Django views | `sharwa_saas/api/views_customers.py` | `sharwa_saas/api/views_wallets.py` |
| Django services | `sharwa_saas/products/services/customer_service.py` | `products/services/wallet_service.py` (merchant) · `products/services/storefront_wallet_service.py` (storefront) |
| Routes in `api/urls.py` | **14** `path()` entries (13 endpoints + the `export.csv/` slash alias) | **12**: 7 merchant + 5 storefront |
| BFF rows | 13 route files (`customers`, `customers/[phone]/**`, `customers/export.csv`, `reviews/[id]`) | 7 merchant route files + 5 storefront files |
| New models / migrations | `CustomerNote`, `ProductReview.customer_phone`, `CustomerReliabilityRecord.cod_status_*` — `0218_customer_crm` | `WalletTransaction.actor`, `WalletTransaction.idempotency_key`, `CustomerPointsTransaction.wallet_transaction` — `0227_wallets_api` |
| Plan feature gate | none | `customer_wallets` (wallets) · `loyalty_settings` (points) |
| Tests | `api/test_customers_api.py` (13) | `api/test_wallets_api.py` (5) |
| Before the integration | only the HTML `customer_report` view; no JSON API | models + HTML screens (`products/views/{wallets,loyalty}.py`); no JSON API |

The registry of live keys is [`architecture/22-live-module-keys.md`](../../../architecture/22-live-module-keys.md) (rows 9 and 19). Both keys are listed there with their route counts; `wallets` is also the key that reaches `customers/loyalty-program/` through the BFF path `loyalty/program`, while `marketing/loyalty` (key `marketing`, Domain 7) reaches the owner-only `loyalty/program/`.

## 2. The derived customer (FR-07.01) <a id="derived-customer"></a>

### 2.1 The customer key

`customer_key(raw)` in `customer_service.py` is the single identity function of the domain:

1. Arabic-Indic (U+0660…) and Eastern-Arabic (U+06F0…) digits are translated to ASCII.
2. `clean_phone_number()` strips `+`, spaces and `-`, drops a leading `00` **or** one leading `0`, and prefixes `967` to a 9-digit number that starts with `7` (Yemeni mobile).
3. Non-digits are removed.
4. A 9-digit number that starts with `5` (Saudi mobile) gets the prefix `966`.
5. Anything that is not a number gives `''` — such an order never creates a customer.

| Raw value stored on an order / wallet / wishlist row | Customer key |
|---|---|
| `771234567` | `967771234567` |
| `0771234567` | `967771234567` |
| `967771234567` | `967771234567` |
| `+967 771234567` | `967771234567` |
| `٠٧٧١٢٣٤٥٦٧` | `967771234567` |
| `0501234567` | `966501234567` |

The first five rows are exactly the values asserted by `test_customer_key` (`api/test_customers_api.py`); the Saudi row is its last assertion. Because the key is computed in Python for every row, `77…`, `077…` and `96777…` are **one customer** wherever they appear (see §2.3). The key is also the **path segment** of every profile URL: `GET /api/v1/customers/<phone>/` accepts any of the raw spellings and normalizes it before looking anything up; the answer always carries the normalized `phone`.

The frontend mirrors the rule in `normalizeCustomerPhone()` (`src/features/customers/schemas.ts`): Arabic digits → ASCII, drop `00`, keep `967`/`966` prefixes, `05…` → `9665…`, any other leading `0` → `967…`. It is a navigation helper only — Django normalizes again.

### 2.2 What counts as a customer

| Rule | Detail |
|---|---|
| Placed orders | every order whose status is **not** `pending_payment` and whose `customer_phone` is not empty (`Order.objects.exclude(status='pending_payment').exclude(customer_phone='')`) |
| Cancelled orders | counted in `orders_count` and in `first_order_at` / `last_order_at`, but **not** in the spend (`display_total_spent`), the average basket, or the `dormant` decision (§ [m07 — list](m07-customers.md#list)) |
| Marketplace-only | a customer all of whose orders have `traffic_source` `amazon` or `noon` is listed with `phone_available=false`: the marketplace hides the real number, so the search does not match it and the CSV export leaves the phone blank |
| 404 | a key with no matching placed order answers `404` `{"detail": "لا عميل بهذا الرقم في متجرك."}` on the profile and on every profile sub-resource that resolves the customer |

### 2.3 How the key is joined to every table

There is no SQL expression that normalizes a phone, and no denormalized key column on the old tables. The provider therefore works in two steps:

| Source | Join method |
|---|---|
| **Orders** (`Order`) | two grouped queries — *raw phone × currency* (counts, spend, first/last dates, marketplace count) and *raw phone × name* (latest name per phone) — both merged **in Python** by `customer_key`; money is converted to the store currency with `convert_amount` per currency group |
| **Wallets** (`Wallet`), **points** (`CustomerPoints`), **reliability** (`CustomerReliabilityRecord`) | the whole table is read once and grouped by `customer_key`; points of several spellings are **summed** |
| **Abandoned carts** (`AbandonedCart`, status `abandoned`) | phones keyed in Python (segment `abandoned_carts`, flag in the profile) |
| **Wishlist** (`WishlistItem`), **back-in-stock** (`BackInStockNotification`), **reviews** (`ProductReview.customer_phone`) | `_matching_raw`: SQL candidates by `…__endswith=<last 9 digits of the key>`, then verified by `customer_key(raw) == key` in Python |
| **Notes** (`CustomerNote`) | stored **with the key itself** (`customer_phone=<key>`) — lookups are exact |
| **Platform trust** (`CentralCustomerTrust`, public schema) | `phone_number IN (…)` in chunks of 1 000; a 12-digit `966…` key is also looked up without the `966` prefix because `clean_phone_number` does not add it |

`_matching_raw` is what keeps the profile fast on a large order table while still merging spellings: the last nine digits are indexed-friendly, the Python check removes the false positives.

> The merchant wallet screen is keyed differently: wallets are stored under `clean_phone_number` (e.g. `967771234567`) and only accept `966`/`967` numbers — see [`m35-wallets-loyalty.md#wallets`](m35-wallets-loyalty.md#wallets).

## 3. One SAR wallet, one ledger (FR-07.04) <a id="wallet"></a>

`Wallet.balance` is **always SAR**, whatever the store currency is. Money is shown as a server string (`display_*`, formatted with `format_money(…, 'SAR')`), never computed by the client. The balance is a snapshot; the source of truth is the append-only `WalletTransaction` ledger, and every change goes through `Wallet.objects.credit()` / `.debit()` (row-locked, atomic). The same ledger is written by three surfaces:

| Writer | Reason code | Direction | Documented in |
|---|---|---|---|
| Order refund to the customer wallet (`process_order_refund`, method `wallet` / `wallet_credit`) | `refund` | credit | [`../04-orders-returns/m06-orders.md#refunds`](../04-orders-returns/m06-orders.md#refunds), [`../04-orders-returns/m24-returns.md`](../04-orders-returns/m24-returns.md) |
| Checkout, «use my wallet» (`reserve_and_create_order`) | `order_payment` | debit | [`../05-storefront/m12-checkout.md#place-order`](../05-storefront/m12-checkout.md#place-order) |
| Checkout, loyalty redemption (`redeem_points_to_wallet`) | `loyalty_redeem` | credit | [`m35-wallets-loyalty.md#checkout-redemption`](m35-wallets-loyalty.md#checkout-redemption) |
| Merchant top-up screen | `manual_topup`, `reward`, `adjustment` | credit (debit only as `adjustment`) | [`m35-wallets-loyalty.md#topup`](m35-wallets-loyalty.md#topup) |

The six `WalletTransaction.REASON_CHOICES` are exactly the six values of the frontend enum `WALLET_REASONS` (`manual_topup`, `refund`, `reward`, `order_payment`, `adjustment`, `loyalty_redeem`) with the labels «تعبئة يدوية», «استرجاع», «مكافأة», «دفع طلب», «تسوية», «استبدال نقاط» (`WALLET_REASON_LABELS`).

The customer's *Sharwa Pay* wallet (`SharwaPayWallet`, cross-store, public schema) is a different thing and lives in Domain 8 ([`../08-finance/m40-sharwa-pay.md`](../08-finance/m40-sharwa-pay.md)).

## 4. Two trust sources, never merged (FR-07.03) <a id="trust"></a>

| | Platform trust | Store trust |
|---|---|---|
| Model | `CentralCustomerTrust` — `core` app, **public** schema, shared by all stores | `CustomerReliabilityRecord` — this store's tenant schema |
| Measures | successful and failed COD orders across the whole platform | refusals at **this** store + this store's own COD decision |
| API shape | `{successful_cod_orders, failed_cod_orders, risk_percentage}` or `null` | `{cod_refusals_count, cod_disabled, reason, updated_at, updated_by}` |
| Who writes | the platform | the delivery flow (`finalize_partial_delivery`) and the merchant (`POST customers/<phone>/cod/`) |
| Affects checkout? | **No** — it is a signal for the merchant only | **Yes** — `cod_disabled` removes cash on delivery for that phone ([`m07-customers.md#cod`](m07-customers.md#cod)) |

The profile returns both under `trust.platform` and `trust.store`; the list returns only the platform risk number. The API never adds them together or derives one from the other.

## 5. Route map of the domain

| Area | Django paths (`/api/v1/…`) | Page |
|---|---|---|
| M07 customers | `customers/` · `customers/segments/count/` · `customers/export.csv` (+ `export.csv/`) · `customers/<phone>/` | [m07 §list → §profile](m07-customers.md#list) |
| M07 profile tabs | `customers/<phone>/orders/` · `…/wallet/transactions/` · `…/points/` · `…/wishlist/` · `…/reviews/` · `reviews/<id>/` | [m07 §sub-resources](m07-customers.md#sub-resources) |
| M07 notes and COD | `customers/<phone>/notes/` · `customers/<phone>/notes/<id>/` · `customers/<phone>/cod/` | [m07 §notes](m07-customers.md#notes), [§cod](m07-customers.md#cod) |
| M35 wallets | `customers/wallets/` · `customers/wallets/<pk>/` · `…/transactions/` · `…/topup/` | [m35 §wallets](m35-wallets-loyalty.md#wallets), [§topup](m35-wallets-loyalty.md#topup) |
| M35 loyalty (merchant) | `customers/loyalty-program/` · `loyalty/points/` · `loyalty/points/<phone>/transactions/` | [m35 §loyalty](m35-wallets-loyalty.md#loyalty) |
| M35 storefront | `wallet/balance-preview/` · `wallet/otp/send/` · `loyalty/balance/` · `loyalty/otp/send/` · `loyalty/redeem/` | [m35 §storefront](m35-wallets-loyalty.md#storefront) |

Routing order matters: in `api/urls.py` the M35 paths `customers/wallets/…` and `customers/loyalty-program/` (and `customers/otp/send/`, which belongs to INT-029) are declared **before** `customers/<str:phone>/`, so the words «wallets» and «loyalty-program» are never read as a phone.

## 6. Gates in one table

| Gate | M07 (`CustomersAPIMixin`) | M35 merchant (`WalletsAPIMixin`) | M35 storefront (`_PublicView`) |
|---|---|---|---|
| CSRF | enforced on unsafe methods (session authentication) | same | **none** (`authentication_classes = []`) |
| Tenant | `HasTenantContext` | same | `HasTenantContext` |
| Session | owner or staff, else `401` «انتهت جلستك، سجّل الدخول مجدداً.» | same | browser session only — the visitor is anonymous |
| Plan feature | — | `customer_wallets` or `loyalty_settings`, else `403` «هذه الميزة غير متاحة في باقتك الحالية» | — |
| Permission | `customers.view` (reads, notes), `customers.edit_profile` (COD, review reply), `customers.export` (CSV) | `customers.view` (reads), `customers.edit_profile` (create wallet, top-up) | — |
| Staff `403` text | «ليست لديك صلاحية لهذا الإجراء.» | same | — |

The owner holds every permission key implicitly; a staff member needs the key. The full gate chain with examples is repeated on each module page.

## 7. Related pages

- Overview: [`bff.md`](../../overview/bff.md), [`conventions.md`](../../overview/conventions.md), [`permissions.md`](../../overview/permissions.md), [`plan-features.md`](../../overview/plan-features.md), [`otp.md`](../../overview/otp.md), [`idempotency.md`](../../overview/idempotency.md), [`money.md`](../../overview/money.md)
- Neighbours: orders and refunds [`../04-orders-returns/`](../04-orders-returns/README.md) · checkout, wishlist, reviews [`../05-storefront/m12-checkout.md`](../05-storefront/m12-checkout.md), [`../05-storefront/m42-wishlist-reviews.md`](../05-storefront/m42-wishlist-reviews.md) · campaigns and the loyalty program settings (Domain 7, written in a later step) [`../07-marketing-design-partners/README.md`](../07-marketing-design-partners/README.md)

Back to the [documentation home](../../../README.md).
