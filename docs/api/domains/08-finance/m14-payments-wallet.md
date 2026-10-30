# Payments & Merchant Wallet API — M14 (المدفوعات ومحفظة المتجر)

> **Source**: DOC-151 → DOC-156 (Step 22) · INT-020 (M14), INT-010 · inventory Domain 8 + A.6, A.7, A.9
> **Live key**: `payments` (`SHARWA_LIVE_MODULES`) — **11 BFF rows**, each `liveOrMock(request, "payments", "/api/v1/…", mockFn)` ([§10](#bff-rows)); `.env.example` lists `payments` in its commented `SHARWA_LIVE_MODULES=` example
> **Django provider**: `sharwa_saas/api/views_payments.py` (`PaymentsAPIMixin`, 11 views) · `sharwa_saas/products/services/payments_service.py` · gateway registry `products/payments/{registry,base,jeeb,kuraimi}.py` · models `products/models/wallets.py` (`MerchantWallet`, `MerchantWalletTransaction`, `MerchantWithdrawalRequest`) · migration `0221_merchant_wallet_api`
> **Frontend contract**: `sharwa-frontend/src/features/payments/schemas.ts` (Zod) · hooks `src/features/payments/api.ts` · fixture `src/mocks/payments/` · BFF `src/app/api/bff/{payments,store/payments,wallet}/…`
> **Tests**: `sharwa_saas/api/test_payments_api.py` (**6** tests, class `PaymentsApiTests`: `test_auth_owner_only_and_features`, `test_gateway_credentials_never_leak_and_enable_rules`, `test_store_payments`, `test_payout_accounts`, `test_wallet_withdrawal_idempotent_and_reject_refunds`, `test_dues_totals_per_currency`)
> **Last verified against code**: 2026-10-27 (step 22)

<a id="overview"></a>

## 1. Overview

M14 is the merchant's **money-out** screen set: which online payment gateways the store accepts, which receiving accounts the merchant has, how much the store wallet holds in each currency, a statement of every movement, withdrawal requests, and the read-only list of what the platform is owed.

**Before INT-020** the same features existed only as HTML screens: `GatewayCredentialForm`, payout-account add / toggle / delete, the wallet page with its withdrawal form (`views/merchant_wallet.py`), and the Django admin actions on withdrawal requests. There was no JSON. INT-020 added the JSON API on top of the **same** models and rules; the only schema change is migration `0221` ([§11](#schema-changes)).

Every route is **owner only** and is gated by the plan. The ledger behind the wallet is described once in [`architecture/43-ledgers.md`](../../../architecture/43-ledgers.md) (L1); this page is the endpoint-level view. The other two ledgers of the domain are [M33 expenses](m33-expenses.md) and [M40 Sharwa Pay](m40-sharwa-pay.md); the domain overview is [`README.md`](README.md).

All paths are under `/api/v1/` on the **tenant host**; the BFF mirrors them under `/api/bff/` ([BFF](../../overview/bff.md)).

<a id="access"></a>

## 2. Access — gate chain

`PaymentsAPIMixin.check` evaluates the gates in this order; the first failing gate answers.

| # | Gate | Requirement | Failure |
|---|---|---|---|
| 1 | Tenant context and session | `HasTenantContext` + `MerchantSessionAuthentication` run first; then `gate()` accepts an owner **or** staff session | `401` `{"detail": "انتهت جلستك، سجّل الدخول مجدداً."}` |
| 2 | **Owner only** | any staff session — whatever permission keys the staff member holds — is refused; there is no permission key that covers money (M14 §2) | `403` `{"detail": "المدفوعات والمحفظة مقصورة على مالك المتجر."}` |
| 3 | **Plan feature** | per route, see the table below | `403` `{"detail": "هذه الميزة غير متاحة في باقتك الحالية"}` (no final full stop) |
| 4 | Resource and input | gateway / account exists, body valid | `404` · `400` `{field: [msg]}` or `{"detail": msg}` |

| Route family | Plan feature (`settings_feature_enabled`) |
|---|---|
| `payments/gateways/` (list) | none for the call itself; **each gateway is kept or dropped** by its own feature |
| `payments/gateways/<code>/` and `…/credentials/` | `payment_gateways` for `kuraimi`; `local_wallets` for `jeeb` (the code set `LOCAL_WALLET_GATEWAY_CODES = {'jeeb'}`) |
| `store/payments/` | **none** (the two switches were M34 settings without a feature) |
| `payments/payout-accounts/…` | `bank_transfers` |
| `wallet/`, `wallet/transactions/`, `wallet/withdrawals/` | `merchantwallet` |
| `wallet/dues/` | **none** (reading what the platform is owed is a permanent right) |

> ⚠️ Discrepancy — roadmap says (DOC-156 and DOC-152) the dues and `store/payments/` routes are "ungated by plan feature" / code does: confirmed for the **plan** gate, but both are still **owner only** (gate 2). A staff session gets the owner-only sentence on `wallet/dues/` as well — `test_auth_owner_only_and_features` calls `wallet/dues/` as staff and expects `403` «المدفوعات والمحفظة مقصورة على مالك المتجر.».

An unknown gateway code is the one case where gate 3 is skipped: the view cannot name a feature for it, so the owner check passes and the service answers `404` `{"detail": "البوابة غير معروفة."}`.

<a id="summary"></a>

## 3. Endpoint summary

| # | Method | Django path (`/api/v1/…`) | Purpose | Plan feature | Success | Section |
|---|---|---|---|---|---|---|
| 1 | `GET` | `payments/gateways/` | gateways available in the plan | per gateway | `200` array | [§4](#gateways) |
| 2 | `GET` | `payments/gateways/<code>/` | one gateway | per gateway | `200` | [§4](#gateways) |
| 3 | `PATCH` | `payments/gateways/<code>/` | `{is_enabled}` | per gateway | `200` the gateway | [§4](#gateways) |
| 4 | `PUT` | `payments/gateways/<code>/credentials/` | save credentials | per gateway | `204` | [§4](#gateways) |
| 5 | `GET` `PATCH` | `store/payments/` | Sharwa Pay / manual-payment switches | none | `200` | [§5](#store-payments) |
| 6 | `GET` `POST` | `payments/payout-accounts/` | list · create | `bank_transfers` | `200` · `201` | [§6](#payout-accounts) |
| 7 | `PATCH` `DELETE` | `payments/payout-accounts/<pk>/` | edit · delete | `bank_transfers` | `200` · `204` | [§6](#payout-accounts) |
| 8 | `POST` | `payments/payout-accounts/reorder/` | `{ordered_ids}` | `bank_transfers` | `200` array | [§6](#payout-accounts) |
| 9 | `GET` | `wallet/` | four balances | `merchantwallet` | `200` | [§7](#wallet) |
| 10 | `GET` | `wallet/transactions/` | statement | `merchantwallet` | `200` | [§7](#wallet) |
| 11 | `GET` `POST` | `wallet/withdrawals/` | list · request | `merchantwallet` | `200` · `201` / `200` | [§8](#withdrawals) |
| 12 | `GET` | `wallet/dues/` | platform dues | none | `200` | [§9](#dues) |

`api/urls.py` holds **11** `path()` entries (lines 338–348); the table has 12 rows only because `GET` and `PATCH` of `gateways/<code>/` are listed separately. The 11 BFF rows are in [§10](#bff-rows).

All money in a response is a **server display string** (`format_money`, e.g. «500 ر.س», «$20»); the only decimal strings are `available` and `amount`, which the client uses for sign and for the local «≤ المتاح» check ([money](../../overview/money.md)). Currencies are exactly `SAR`, `USD`, `YER_OLD`, `YER_NEW`, each with its own balance — never converted, never summed.

<a id="gateways"></a>

## 4. Payment gateways — `payments/gateways/`

*(DOC-151)*

A gateway is a bank or wallet integration a **customer** pays through at checkout. The set is fixed in code: `GATEWAY_REGISTRY` in `products/payments/registry.py` holds two classes today, and the screen renders whatever field descriptors arrive, so a third gateway needs one registry line and no API change.

### `GET /api/v1/payments/gateways/`

Returns an array (not an envelope), in registry order, **without** the gateways whose plan feature is off. The `GatewayListView` passes a filter `allowed(code)` built from `settings_feature_enabled(request, gateway_feature(code))`.

```json
[
  {
    "gateway_code": "jeeb",
    "name": "محفظة جيب",
    "description": "خصم فوري من محفظة الزبون. يولّد الزبون كود شراء من تطبيق جيب ويدخله عند الدفع.",
    "is_enabled": false,
    "has_credentials": false,
    "updated_at": null,
    "fields": [
      {"name": "merchant_id", "label": "معرف التاجر لدى جيب", "is_secret": false, "required": true, "masked_hint": null, "value": null},
      {"name": "base_url", "label": "رابط API", "is_secret": false, "required": true, "masked_hint": null, "value": null},
      {"name": "api_key", "label": "مفتاح API", "is_secret": true, "required": true, "masked_hint": null, "value": null},
      {"name": "api_secret", "label": "الرمز السري", "is_secret": true, "required": true, "masked_hint": null, "value": null}
    ]
  }
]
```

The shape is `gatewaySchema` in `schemas.ts`; `test_gateway_credentials_never_leak_and_enable_rules` asserts the exact field keys `{name, label, is_secret, required, masked_hint, value}`.

| Field | Type | Meaning |
|---|---|---|
| `gateway_code` | string | registry key (`jeeb`, `kuraimi`) |
| `name` | string | the class's `display_name` |
| `description` | string \| null | the class's `description`, `null` when empty |
| `is_enabled` | boolean | stored flag **and** `has_credentials` — a gateway enabled with missing fields reports `false` |
| `has_credentials` | boolean | every `required` field has a stored value |
| `updated_at` | ISO string \| null | `PaymentCredential.updated_at`, `null` if never saved |
| `fields[]` | array | one descriptor per `credential_fields` entry, in the class's order |

### Fields per gateway

`GATEWAY_REGISTRY[code].credential_fields` is the **only** source of the field list; the values live in the encrypted `PaymentCredential`. Every field is `required` (the default of `CredentialField`).

**`jeeb`** — «محفظة جيب» · plan feature `local_wallets` · customer supplies a `purchase_code`

| `name` | `label` | `is_secret` | kind |
|---|---|---|---|
| `merchant_id` | معرف التاجر لدى جيب | no | text |
| `base_url` | رابط API | no | url |
| `api_key` | مفتاح API | **yes** | text |
| `api_secret` | الرمز السري | **yes** | text |

**`kuraimi`** — «حاسب الكريمي» · plan feature `payment_gateways` · customer supplies a `pin`

| `name` | `label` | `is_secret` | kind |
|---|---|---|---|
| `merchant_code` | معرف تاجر حاسب | no | text |
| `base_url` | رابط API | no | url |
| `api_key` | مفتاح API | **yes** | text |
| `api_secret` | الرمز السري | **yes** | text |

The descriptor's `help_text` (for example the `base_url` example link) is **not** part of the response.

### Masking — no secret leaves the service

- A **secret** field is returned as `masked_hint` only: `«••••»` followed by the last four characters (`_mask`: `'••••' + value[-4:]` when the value is longer than four characters, otherwise just `«••••»`), and `value` is always `null`. With nothing stored, `masked_hint` is `null`.
- A **non-secret** field returns `value` (the stored text, or `null`) and `masked_hint` is always `null`.
- The test stores the key `sk_live_9c41b2e07f2a` and the secret `whsec_51d0aa93e6b4`, then asserts neither string appears anywhere in the response body and `api_key.masked_hint == '••••7f2a'`.

### `GET /api/v1/payments/gateways/<code>/`

One gateway, the same object. `404` `{"detail": "البوابة غير معروفة."}` for a code outside the registry; `403` when the gateway's plan feature is off (the list silently drops it instead).

### `PATCH /api/v1/payments/gateways/<code>/`

| Field | Type | Required | Rules |
|---|---|---|---|
| `is_enabled` | boolean | yes | any non-boolean ⇒ `400` `{"is_enabled": ["قيمة غير صالحة."]}` |

Returns `200` with the gateway object after the change. The service runs inside `transaction.atomic()` on a **row-locked** `PaymentCredential` (`select_for_update`, created empty on first touch).

- **Enabling** needs every required field: otherwise `400` `{"is_enabled": ["لا يمكن تفعيل <name> قبل تعبئة: <labels>"]}` — `<name>` is the gateway `display_name` and `<labels>` the missing labels joined with «، » (no final full stop). Example: «لا يمكن تفعيل محفظة جيب قبل تعبئة: معرف التاجر لدى جيب، رابط API، مفتاح API، الرمز السري».
- **Disabling the last method** is refused. When the stored flag is currently on and the request turns it off, the service loads `StoreSetting`; if `enable_manual_payment` is off **and** `enable_sharwa_pay` is off **and** no other gateway is enabled with complete credentials (`get_enabled_gateway_codes()` minus this one), it answers `400` `{"detail": "يجب تفعيل طريقة دفع واحدة على الأقل."}`. This is the same guard as `store/payments/` ([§5](#store-payments)).

### `PUT /api/v1/payments/gateways/<code>/credentials/`

The body is a flat object keyed by field `name`. The answer is `204` with no body.

- A field that is **absent, `null` or empty after trimming keeps the stored value** — secret or not. The frontend sends all fields on every save, so an untouched secret box does not erase the secret.
- **Partial saves are allowed** (the `GatewayCredentialForm` rule): only *enabling* requires completeness. The test saves `merchant_id` and `api_key`, then in a second PUT sends empty strings for those two plus `base_url` and `api_secret`, and the stored `merchant_id` and `api_key` are unchanged.
- Validation, collected per field into `400` `{field: [msg]}`:

| Condition | Message |
|---|---|
| value present but not a string | «قيمة غير صالحة.» |
| trimmed length > 500 (`SECRET_MAX`) | «القيمة أطول من المسموح.» |
| `kind == 'url'` and not an `http`/`https` URL | «أدخل رابطاً صحيحاً يبدأ بـ https://» |
| body is not a JSON object | `400` `{"detail": "جسم الطلب غير صالح."}` |

> ⚠️ Discrepancy — roadmap says (DOC-151) "`base_url` validated as URL" / code does: the validator is `URLValidator(schemes=['http', 'https'])`, so a plain `http://` URL is **accepted**, while the error sentence tells the merchant the link must begin with `https://`.

> ⚠️ Discrepancy — roadmap says (DOC-151) "Gates: owner only; plan features … per gateway — list omits gateways outside the plan" / code does: only the **list** omits. `GET`, `PATCH` and `PUT` on a gateway outside the plan answer `403` «هذه الميزة غير متاحة في باقتك الحالية»; the test confirms the list returns `['kuraimi']` and `GET payments/gateways/jeeb/` returns `403` when only `payment_gateways` is on.

**Limitation of this step.** `src/app/api/bff/payments/gateways/[code]/credentials/route.ts` is nested eight folders deep and cannot be staged for reading; its row is documented from its sibling `gateways/[code]/route.ts`, from `features/payments/api.ts` and from `architecture/22-live-module-keys.md` (row 12: *11 = 10 + 1 deep*). The Django side was read in full.

<a id="store-payments"></a>

## 5. Store payment switches — `GET|PATCH /api/v1/store/payments/`

*(DOC-152)*

Two switches on the **same `StoreSetting` row** as the M34 settings section «الدفع» (`settings/payments/`), so both screens always agree. The view adds no rule of its own: `PATCH` calls `settings_service.patch_payments`.

**Gate**: owner only; **no plan feature**.

**`GET` → `200`**

```json
{"enable_sharwa_pay": false, "enable_manual_payment": true, "active_payout_accounts": 1}
```

`active_payout_accounts` counts `PayoutAccount` rows with `is_active=True`.

**`PATCH` body** — either key or both; unknown keys are ignored.

| Field | Type | Rules |
|---|---|---|
| `enable_manual_payment` | boolean | a non-boolean ⇒ `400` `{<key>: ["قيمة غير صالحة."]}` |
| `enable_sharwa_pay` | boolean | same |

**Guard — "at least one payment method"**: after merging the body with the stored values, if manual payment is off, Sharwa Pay is off **and** no gateway is enabled with complete credentials, the request fails with `400` `{"detail": "يجب تفعيل طريقة دفع واحدة على الأقل."}` and nothing is saved. The three kinds of method are therefore *manual payment + Sharwa Pay + direct gateways*, and the same guard stops disabling the last enabled gateway ([§4](#gateways)).

The response is the same object as `GET`, after the change. Test (`test_store_payments`): with one account added, `PATCH {enable_manual_payment: true, enable_sharwa_pay: false}` returns `{"enable_sharwa_pay": false, "enable_manual_payment": true, "active_payout_accounts": 1}`; then `PATCH {enable_manual_payment: false}` answers the guard sentence.

<a id="payout-accounts"></a>

## 6. Payout accounts — `payments/payout-accounts/`

*(DOC-153)*

A **payout account** is a bank account or a local wallet the merchant owns. It serves two purposes: the destination of a withdrawal ([§8](#withdrawals)) and the receiving account shown to customers for manual transfers. **Gate**: owner only; plan feature `bank_transfers`.

### `GET /api/v1/payments/payout-accounts/`

| Query | Values | Effect |
|---|---|---|
| `account_type` | `bank` · `wallet` | filter; any other value is ignored |
| `is_active` | `true` | only active accounts; any other value is ignored |

```json
{
  "count": 3,
  "counts": {"bank": 1, "wallet": 2},
  "results": [
    {"id": 3, "account_type": "bank", "provider_name": "الراجحي", "account_number": "SA44 8000 0204", "account_name": "متجر نور", "is_active": true, "sort_order": 0},
    {"id": 1, "account_type": "wallet", "provider_name": "جيب", "account_number": "777 410 225", "account_name": "متجر نور", "is_active": true, "sort_order": 0},
    {"id": 2, "account_type": "wallet", "provider_name": "جيب", "account_number": "733902118", "account_name": "متجر نور", "is_active": true, "sort_order": 1}
  ]
}
```

- `count` is the size of the **filtered** list; `counts` is always the unfiltered total per type (the two tabs' badges).
- **Order**: banks first, then wallets; inside a type by `sort_order`, then `created_at`, then `pk`.
- No pagination — the list is small by design.

### `POST /api/v1/payments/payout-accounts/` → `201` the account

| Field | Type | Required | Rules and messages |
|---|---|---|---|
| `account_type` | `bank` \| `wallet` | yes | otherwise «اختر بنكاً أو محفظة.» |
| `provider_name` | string | yes | trimmed; empty «اكتب اسم البنك أو المحفظة.»; > 100 «100 حرف على الأكثر.» |
| `account_number` | string | yes | Arabic and Persian digits become Latin, runs of whitespace collapse to one space; fewer than 4 characters «أدخل رقم الحساب أو الآيبان.»; > 150 «150 خانة على الأكثر.»; characters other than `A–Z a–z 0–9`, space and `-` «أرقام وحروف لاتينية فقط.»; a duplicate «هذا الرقم مضاف مسبقاً.» |
| `account_name` | string | yes | trimmed; fewer than 2 characters «اكتب اسم صاحب الحساب.»; > 150 «150 حرفاً على الأكثر.» |
| `is_active` | boolean | no | a non-boolean «قيمة غير صالحة.» |

**Duplicate rule.** Numbers are compared after removing **all spaces and dashes**, converting Arabic/Persian digits to Latin and upper-casing — so `777 410 225`, `777-410-225` and `٧٧٧-٤١٠-٢٢٥` are the same number. The comparison covers every account of both types (excluding the account being edited). `test_payout_accounts` posts `٧٧٧-٤١٠-٢٢٥` after `777 410 225` and expects `{"account_number": ["هذا الرقم مضاف مسبقاً."]}`.

**`sort_order`** of a new account is the highest in its type plus one (`0` for the first of a type), computed under `select_for_update`.

### `PATCH /api/v1/payments/payout-accounts/<pk>/` → `200` the account

Only `provider_name`, `account_number`, `account_name` and `is_active` are read; **`account_type` and `sort_order` in the body are ignored** (the test sends `account_type: 'bank'` for a wallet and gets `wallet` back). The same validators run, only for keys present. Unknown `pk` ⇒ `404` `{"detail": "الحساب غير موجود."}`.

### `DELETE /api/v1/payments/payout-accounts/<pk>/` → `204`

Refused with `400` while any withdrawal request with `status='pending'` points at the account:

```json
{
  "detail": "هذا الحساب مرتبط بطلب سحب قيد المراجعة ولا يمكن حذفه الآن. عطّله ليختفي عن العملاء، واحذفه بعد البتّ في الطلب.",
  "code": "has_pending_withdrawal"
}
```

Once the request is decided the delete succeeds; the request keeps its text snapshot `payout_destination` and its FK becomes `NULL` (`on_delete=SET_NULL`), shown later as the label `payout_destination` or «حساب محذوف».

### `POST /api/v1/payments/payout-accounts/reorder/`

Body `{"ordered_ids": [2, 1]}` → `200` the **full list of that type** in its new order, as an array of account objects (not the `{count, counts, results}` envelope). Rules, checked in order and all answered `400` `{"ordered_ids": [msg]}`:

| Check | Message |
|---|---|
| not a non-empty list of distinct integers (booleans refused) | «قائمة غير صالحة.» |
| an id does not exist | «حساب غير موجود في القائمة.» |
| the ids belong to more than one type | «رتّب حسابات نوع واحد في كل مرة.» |
| the list does not hold **every** account of that type | «أرسل كل حسابات النوع بترتيبها الكامل.» |

On success `sort_order` becomes the index in the list (`0, 1, …`), written with `bulk_update` under row locks.

<a id="wallet"></a>

## 7. Merchant wallet — `wallet/` and `wallet/transactions/`

*(DOC-154)*

**Gate**: owner only; plan feature `merchantwallet`.

The wallet is a **single row** (`MerchantWallet`, `pk=1`) in the store's own schema with four balance columns, one per currency, changed only by `MerchantWallet.objects.credit/debit` (row lock + one `MerchantWalletTransaction` row each). It is filled by order payments and emptied by refunds, cancellations and withdrawals ([architecture/43-ledgers.md](../../../architecture/43-ledgers.md#41-l1--merchant-wallet)).

### `GET /api/v1/wallet/`

```json
{
  "balances": [
    {
      "currency": "SAR",
      "display_balance": "500 ر.س",
      "display_available": "300 ر.س",
      "available": "300.00",
      "display_reserved": "200 ر.س",
      "pending_withdrawals": 1
    }
  ],
  "updated_at": "2026-10-27T09:00:00+00:00"
}
```

The example is the SAR row of `test_wallet_withdrawal_idempotent_and_reject_refunds` after a 500 credit and a 200 withdrawal request (`available '300.00'`, `display_balance '500 ر.س'`, `display_reserved '200 ر.س'`, `pending_withdrawals 1`); the response always carries **four rows**, in the order `SAR`, `USD`, `YER_OLD`, `YER_NEW`. The timestamp is illustrative.

**Derived contract.** The frontend contract has three amounts, but Django debits a withdrawal **at request time**, so the stored balance is already net of pending requests. `read_wallet` derives:

| Field | Derivation |
|---|---|
| `available` / `display_available` | the **stored** balance of that currency |
| `display_reserved` / `pending_withdrawals` | sum and count of `MerchantWithdrawalRequest` rows with `status='pending'` in that currency |
| `display_balance` | `available + reserved` — what the wallet would show if nothing were pending |

Worked example: stored 500 → request 200 → stored 300. `available = 300`, `reserved = 200`, `display_balance = 500`. A rejection credits 200 back, so the stored balance is 500 again and `reserved` is 0; an approval leaves the stored 300 and the reserved part disappears.

### `GET /api/v1/wallet/transactions/`

| Query | Default | Notes |
|---|---|---|
| `currency` | — | one of the four codes; others ignored |
| `type` | — | one of the kinds below; others ignored |
| `from`, `to` | — | `YYYY-MM-DD`, compared on `created_at__date` (`gte` / `lte`); an unparsable date is ignored |
| `page` | `1` | |
| `page_size` | `50` | clamped 1–100 |

Order: `-created_at, -id`. Response `{count, results[]}`:

```json
{
  "count": 2,
  "results": [
    {
      "id": 2,
      "type": "withdrawal",
      "currency": "SAR",
      "reason": "طلب سحب رصيد #1 — قيد المراجعة",
      "reference": {"kind": "withdrawal", "id": 1, "label": "طلب سحب #1"},
      "amount": "-200.00",
      "display_amount": "-200 ر.س",
      "display_balance_after": "300 ر.س",
      "created_at": "2026-10-27T09:00:00+00:00"
    },
    {
      "id": 1,
      "type": "order_payment",
      "currency": "SAR",
      "reason": "إيداع قيمة الطلب #12",
      "reference": {"kind": "order", "id": 12, "label": "طلب #12"},
      "amount": "500.00",
      "display_amount": "+500 ر.س",
      "display_balance_after": "500 ر.س",
      "created_at": "2026-10-27T08:00:00+00:00"
    }
  ]
}
```

(The test asserts the types `['withdrawal', 'order_payment']`, the withdrawal's `amount '-200.00'`, `display_amount '-200 ر.س'` and both reference labels; ids and timestamps here are illustrative.)

| Field | Meaning |
|---|---|
| `type` | the row's `kind`: `order_payment` · `refund` · `commission` · `withdrawal` · `adjustment` |
| `reason` | the row's `description`, or the kind's Arabic label when the description is empty (تحصيل طلب · استرجاع · عمولة المنصة · سحب · تسوية) |
| `reference` | `{kind, id, label}` or `null`. `kind` is `order`, `commission` or `withdrawal`; labels are «طلب #<id>», «طلب سحب #<id>», «عمولة #<id>». `null` when the row has no reference |
| `amount` | **signed** decimal string: `+` for a credit, `-` for a debit |
| `display_amount` | the sign (`+`/`-`) followed by `format_money(abs(amount))` |
| `display_balance_after` | `balance_after` of the audit row, formatted |

### Ledger kinds — migration `0221_merchant_wallet_api`

`MerchantWalletTransaction.kind` (choices `order_payment`, `refund`, `commission`, `withdrawal`, `adjustment`; default `adjustment`) and `reference_kind` / `reference_id` were added by `0221`. Each writer passes both through `credit/debit(..., kind=…, reference=(kind, id))`:

| `kind` | Direction | Writer | Reference |
|---|---|---|---|
| `order_payment` | credit | `merchant_credit_service.process_order_merchant_credit` | `order` |
| `refund` | debit | `refund_service.process_order_refund` | `order` |
| `adjustment` | debit | `Order.cancel_order` — description «عكس إيداع الطلب #<id> — تم إلغاء الطلب» | `order` |
| `withdrawal` | debit at request · credit on rejection | `payments_service.create_withdrawal` · `decide_withdrawal` | `withdrawal` |
| `commission` | — | **no code writes it** | — |

**Backfill.** The migration classified every existing row from its description, whose wording was fixed in code (first match wins, `#<number>` becomes `reference_id`): contains «سحب» ⇒ `withdrawal`; «استرجاع» ⇒ `refund`; «إلغاء» ⇒ `adjustment`; «إيداع قيمة الطلب» ⇒ `order_payment`; anything else ⇒ `adjustment` with no reference. The reverse of the backfill is a no-op.

> ⚠️ Discrepancy — roadmap says (DOC-154) the kinds are written by `merchant_credit_service` (order_payment), `refund_service` (refund), order cancellation (adjustment) and withdrawals / code does: exactly those four, **and** `commission` (with the `commission` reference kind) is declared in the model choices, the migration and the Zod enum but **no code writes it** — platform commission is collected from the merchant's Sharwa Pay wallet, not from this one (model comment, `wallets.py:253`)., so the filter `?type=commission` is valid and returns nothing today.

Reversal rules for the kinds (cancel and refund swallow an insufficient balance) are in [architecture/43-ledgers.md §4.1](../../../architecture/43-ledgers.md#41-l1--merchant-wallet).

<a id="withdrawals"></a>

## 8. Withdrawals — `wallet/withdrawals/` and the admin decision

*(DOC-155)*

A withdrawal moves money from the store wallet to one of the merchant's payout accounts. The transfer itself happens **outside the system**; the system records the request, holds the money, and lets the platform decide. **Gate**: owner only; plan feature `merchantwallet`.

### `GET /api/v1/wallet/withdrawals/`

Query: `status` (`pending` · `approved` · `rejected`), `currency`, `page`, `page_size` (default 50, max 100); invalid values are ignored. Order `-created_at, -id`. Response `{count, results[]}`:

```json
{
  "count": 1,
  "results": [
    {
      "id": 1,
      "currency": "SAR",
      "amount": "200.00",
      "display_amount": "200 ر.س",
      "status": "rejected",
      "payout_account": {"id": 1, "label": "جيب — متجر نور", "account_number": "777410225"},
      "created_at": "2026-10-27T09:00:00+00:00",
      "decided_at": "2026-10-27T10:00:00+00:00",
      "rejection_reason": "الاسم لا يطابق السجل"
    }
  ]
}
```

(Values from `test_wallet_withdrawal_idempotent_and_reject_refunds`: label «جيب — متجر نور», reason «الاسم لا يطابق السجل»; timestamps illustrative.)

- `payout_account.label` is `<provider_name> — <account_name>`. When the account was deleted: `{"id": 0, "label": <payout_destination snapshot, else «حساب محذوف»>, "account_number": "—"}`.
- `decided_at` is `reviewed_at`; `rejection_reason` is `null` when empty.
- Status labels (UI): `pending` «قيد المراجعة» · `approved` «مُنفَّذ» · `rejected` «مرفوض».

### `POST /api/v1/wallet/withdrawals/`

**Headers**: `Idempotency-Key` (optional, first 64 characters are used). **Body** (`application/json`):

| Field | Type | Required | Rules and messages |
|---|---|---|---|
| `currency` | string | yes | one of `SAR`, `USD`, `YER_OLD`, `YER_NEW`, otherwise «اختر عملة.» |
| `amount` | string or number | yes | matches `^\d{1,10}(\.\d{1,2})?$` and is greater than 0, otherwise «أدخل مبلغاً موجباً بخانتين عشريتين على الأكثر.»; booleans refused |
| `payout_account_id` | integer or numeric string | yes | the account must exist, otherwise «اختر حساب الاستلام.»; an inactive account «هذا الحساب معطّل؛ اختر حساباً نشطاً.» |

**Success**: `201` `{"id": 1, "status": "pending"}`.

**Insufficient balance**: `400` `{"amount": ["المبلغ أكبر من المتاح للسحب (500 ر.س)."]}` — the figure is the stored (available) balance of that currency, formatted by the server. Test: balance 500, request 600 ⇒ exactly that sentence.

**Field errors** are all reported together: the test sends `{currency: 'EUR', amount: '1.234', payout_account_id: <inactive>}` and gets the three keys `currency`, `amount`, `payout_account_id`.

**What happens in one transaction** (`transaction.atomic`):

1. `MerchantWallet` row locked with `select_for_update`; the available balance of the currency is read **under the lock**.
2. If `amount > available` ⇒ the `400` above; nothing is written.
3. `MerchantWithdrawalRequest` created: `status='pending'`, `payout_account` = the chosen account, `payout_destination` = the text snapshot `<provider_name> — <account_name> — <account_number>` cut to 255 characters, `idempotency_key` = the header value.
4. `MerchantWallet.objects.debit(...)` with description «طلب سحب رصيد #<id> — قيد المراجعة», `kind='withdrawal'`, `reference=('withdrawal', id)`.

So the money is **debited immediately** — the merchant cannot spend it twice — and shown as «محجوز» in the wallet until the platform decides.

### Idempotency

| Case | Result |
|---|---|
| first request with a key | `201` as above |
| the same key again, any body | `200` `{"id": <the first request's id>, "status": <its current status>}` — **no second debit**, and the body is **not compared** with the first |
| two concurrent requests with the same key | the unique `idempotency_key` raises `IntegrityError` for the second, which returns the first request as `200` |
| no `Idempotency-Key` | every call creates a request |

The key is stored on `MerchantWithdrawalRequest.idempotency_key` (`unique`, nullable, 64 characters); the replay is looked up **before** validation. Test: the same body with `Idempotency-Key: k-1` posted twice ⇒ `201` then `200` with the same `id`, and `MerchantWithdrawalRequest.objects.count() == 1`. See [idempotency](../../overview/idempotency.md).

> ⚠️ Discrepancy — roadmap says (DOC-155) `MerchantWithdrawalRequest.idempotency_key` + `payout_account` (FK SET_NULL, `payout_destination` kept as snapshot) / code does: confirmed (migration `0221`). The **request body** name is `payout_account_id` (a string in the form, an integer on the wire), not `payout_account`; `payout_account` is the model FK and the key inside a withdrawal *response*.

### The decision path — `decide_withdrawal`

**There is no HTTP route that approves or rejects a merchant withdrawal.** The decision belongs to the platform and today is made in the Django admin (`products/admin.py`, `MerchantWithdrawalRequestAdmin`):

| Admin action | Effect |
|---|---|
| «✅ تأكيد تنفيذ السحب (بعد التحويل الفعلي خارج النظام)» | `decide_withdrawal(pk, 'approved')` — status `approved`; the real transfer happens by hand **before** this click |
| «⛔ رفض طلب السحب وإعادة المبلغ للرصيد» | `decide_withdrawal(pk, 'rejected')` — credits the amount back and status `rejected` |

`payments_service.decide_withdrawal(pk, decision, reason='')`:

1. `transaction.atomic()`; the request row is loaded with `select_for_update`.
2. Missing ⇒ `ProductApiError(404, {"detail": "الطلب غير موجود."})`.
3. Not `pending` ⇒ `ProductApiError(409, {"detail": "تم البتّ في هذا الطلب مسبقاً."})`.
4. On `rejected`: `MerchantWallet.objects.credit(...)` with description «إعادة رصيد — رُفِض طلب السحب #<id>», `kind='withdrawal'`, reference `('withdrawal', id)`, and `rejection_reason = reason[:255]`.
5. `status` and `reviewed_at = now` saved. The function returns the withdrawal view.

**The concurrency bug this fixed.** The old admin loop did not lock the request before crediting, so two simultaneous clicks on «رفض» each saw `pending` and **refunded twice**. The row lock plus the `pending` guard make the second click fail with the 409 (the admin action catches `ProductApiError` and counts only the decisions that succeeded). Test: after a rejection, `decide_withdrawal(…, 'approved')` raises `ProductApiError` and the wallet balance is exactly `500.00`.

> ⚠️ Discrepancy — roadmap says (DOC-155) reject "refunds on rejection … via `payments_service.decide_withdrawal`" and the service accepts a `reason` / code does: the admin action calls `decide_withdrawal(pk, decision)` **without** a reason, so a request rejected from the admin shows `rejection_reason: null` in `wallet/withdrawals/`. Only direct callers of the service (the test passes «الاسم لا يطابق السجل») can set one.

The legacy HTML withdrawal form (`views/merchant_wallet.merchant_withdrawal_request_view`) still debits through the manager with kind `withdrawal`; both paths show up in the same statement. Platform-side approvals of the **Sharwa Pay** wallet are a different flow ([M40](m40-sharwa-pay.md), INT-031).

<a id="dues"></a>

## 9. Platform dues — `GET /api/v1/wallet/dues/`

*(DOC-156)*

What the platform is owed by the store, **read only**. Two sources, chosen by `kind`:

| `kind` | Model | Amount | `title` |
|---|---|---|---|
| `commission` (default) | `PlatformCommissionRecord` — one row per order, created when `PlatformBillingSettings.commission_enabled` is on | `amount` in `currency` | «عمولة المنصة على طلب» |
| `app_charge` | `AppBillingCharge` — a paid app's billing cycle | `price_snapshot` in `currency` | the app's `app_name_snapshot` |

**Gate**: owner only; **no plan feature**.

| Query | Default | Notes |
|---|---|---|
| `kind` | `commission` | `app_charge` selects app charges; **any other value silently means `commission`** |
| `status` | — | `pending` · `collected` · `waived`; filters `results` only |
| `page`, `page_size` | `1`, `50` | `page_size` clamped 1–100 |

```json
{
  "commission_enabled": false,
  "totals": {"pending": "2.50 ر.س · $1", "collected": "0 ر.س", "waived": "0 ر.س"},
  "counts": {"pending": 2, "collected": 0, "waived": 0},
  "count": 2,
  "results": [
    {
      "id": 1,
      "kind": "commission",
      "status": "pending",
      "title": "عمولة المنصة على طلب",
      "detail": "2.5% من قيمة الطلب — باقة النمو",
      "reference": {"kind": "order", "id": 7, "label": "طلب #7"},
      "display_amount": "2.50 ر.س",
      "created_at": "2026-10-27T09:00:00+00:00",
      "settled_at": null
    }
  ]
}
```

(Values from `test_dues_totals_per_currency`: two pending records, 2.50 SAR and 1 USD; ids and timestamps illustrative.)

**Per-currency totals — never summed across currencies.** `totals` and `counts` are computed over **all** rows of the chosen `kind` regardless of the `status` filter — one grouped query `values('status', 'currency')` with `Sum`. `totals[status]` is the per-currency sums formatted by the server and joined with « · », currencies sorted by code: «2.50 ر.س · $1». Currencies whose total is zero are skipped; a status with nothing shows «0 ر.س».

**Row fields**

| Field | Commission row | App-charge row |
|---|---|---|
| `detail` | `<value>% من قيمة الطلب — باقة <plan>` for a percentage (the value without trailing zeros: `2.5%`), or «مبلغ ثابت عن كل طلب — باقة <plan>» for a fixed fee; « · <notes>» appended when the record has notes | «دورة <period_label>», plus « · <notes>» |
| `reference` | `{kind: "order", id, label: "طلب #<id>"}` | `null` |
| `settled_at` | `collected_at` | `collected_at` |

`commission_enabled` is `PlatformBillingSettings.load().commission_enabled` — it tells the client whether the platform is currently recording commissions.

**Collection is not here.** Moving a due from `pending` to `collected` or `waived` is done by the platform: the Django admin actions on these two models deduct the amount from the **merchant's own Sharwa Pay wallet** (`tenants/merchant_billing.py`) — the console side (INT-031) and Domain 16 document it. This endpoint never changes a status.

<a id="bff-rows"></a>

## 10. BFF rows and the live key

*(DOC-156)*

`SHARWA_LIVE_MODULES` containing `payments` switches these **11 rows** from the fixture to Django; each is `liveOrMock(request, "payments", "<upstream>", () => mockHandler)`, and the mock handlers sit behind `ownerRoute` (an owner session):

| # | BFF path (`/api/bff/…`) | Methods | Upstream |
|---|---|---|---|
| 1 | `payments/gateways` | `GET` | `/api/v1/payments/gateways/` |
| 2 | `payments/gateways/[code]` | `GET`, `PATCH` | `/api/v1/payments/gateways/<code>/` |
| 3 | `payments/gateways/[code]/credentials` (**deep**) | `PUT` | `…/credentials/` |
| 4 | `store/payments` | `GET`, `PATCH` | `/api/v1/store/payments/` |
| 5 | `payments/payout-accounts` | `GET`, `POST` | `/api/v1/payments/payout-accounts/` |
| 6 | `payments/payout-accounts/[id]` | `PATCH`, `DELETE` | `…/<id>/` |
| 7 | `payments/payout-accounts/reorder` | `POST` | `…/reorder/` |
| 8 | `wallet` | `GET` | `/api/v1/wallet/` |
| 9 | `wallet/transactions` | `GET` | `/api/v1/wallet/transactions/` |
| 10 | `wallet/withdrawals` | `GET`, `POST` | `/api/v1/wallet/withdrawals/` — forwards the `Idempotency-Key` header |
| 11 | `wallet/dues` | `GET` | `/api/v1/wallet/dues/` |

The two other files under `src/app/api/bff/wallet/` (`otp/send`, `balance-preview`) belong to the **customer** wallet of Domain 6 ([M35](../06-customers-wallets/m35-wallets-loyalty.md)) and use the key `wallets`. The key register is [`architecture/22-live-module-keys.md`](../../../architecture/22-live-module-keys.md) (row 12: *11 (10 + 1 deep)*).

<a id="schema-changes"></a>

## 11. Gaps closed, bugs fixed and migrations

- **Migration `0221_merchant_wallet_api`** (`products` app, depends on `0220_marketing_api`): `MerchantWalletTransaction.kind` (db-indexed, default `adjustment`), `reference_kind` (blank, default empty), `reference_id` (nullable big integer); `MerchantWithdrawalRequest.payout_account` (nullable FK to `PayoutAccount`, `SET_NULL`, `related_name='withdrawal_requests'`) and `idempotency_key` (unique, nullable, 64); a `RunPython` backfill of the kinds ([§7](#wallet)).
- **Bug fixed — double refund on rejection.** `decide_withdrawal` replaces an unlocked loop ([§8](#withdrawals)); the admin actions now go through it.
- **Contract gap closed — reserved money.** The `available / reserved / balance` contract is derived from the stored balance and the pending requests, with no new column ([§7](#wallet)).
- **Reused, not duplicated**: `settings_service.patch_payments` (the M34 rule), `GatewayCredentialForm` semantics, `require_feature` decisions via `settings_feature_enabled`.

<a id="open-items"></a>

## 12. Open items and legacy-only behaviour

- No HTTP route decides a merchant withdrawal ([§8](#withdrawals)); an M45 console screen for it is planned (`decide_withdrawal`'s docstring: «لوحة الإدمن اليوم، M45 لاحقاً»).
- `kind = commission` is never written to the merchant wallet ([§7](#wallet)).
- If the merchant has already withdrawn an order's money, a refund or cancellation still completes and the wallet is **not** pushed negative — the debit is skipped silently and no debt is recorded ([architecture/43-ledgers.md §9](../../../architecture/43-ledgers.md)).
- Legacy HTML screens (`GatewayCredentialForm`, wallet page, admin actions) keep working beside the API; they share the models and the managers.

<a id="related"></a>

## 13. Related pages

- Domain overview and the three ledgers: [`README.md`](README.md)
- Operating expenses: [`m33-expenses.md`](m33-expenses.md) · Sharwa Pay (customer wallet, platform origin): [`m40-sharwa-pay.md`](m40-sharwa-pay.md)
- Customer wallets and loyalty (Domain 6): [`../06-customers-wallets/m35-wallets-loyalty.md`](../06-customers-wallets/m35-wallets-loyalty.md) · checkout with Sharwa Pay: [`../05-storefront/m12-checkout.md`](../05-storefront/m12-checkout.md)
- Cross-cutting: [permissions](../../overview/permissions.md) · [plan features](../../overview/plan-features.md) · [errors](../../overview/errors.md) · [money](../../overview/money.md) · [idempotency](../../overview/idempotency.md) · [BFF](../../overview/bff.md)
- Architecture: [ledgers](../../../architecture/43-ledgers.md) · [concurrency](../../../architecture/42-concurrency.md) · [approvals](../../../architecture/45-approvals.md) · [live module keys](../../../architecture/22-live-module-keys.md)
- Merchant guide (Arabic): [`../../../guides/merchant/08-finance/README.md`](../../../guides/merchant/08-finance/README.md)
