# Operating Expenses API — M33 (المصروفات التشغيلية)

> **Source**: DOC-157, DOC-158 (Step 22) · INT-043 (M33) · inventory Domain 8 + A.5, A.9
> **Live key**: `expenses` (`SHARWA_LIVE_MODULES`) — **1 BFF row**, an optional catch-all `src/app/api/bff/expenses/[[...path]]/route.ts` exporting `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, each `liveOrMock(request, "expenses", "/api/v1/expenses/[<path>/]", …)`; `.env.example` lists `expenses`
> **Django provider**: `sharwa_saas/api/views_expenses.py` (`ExpensesAPIMixin`, 2 views) · `sharwa_saas/products/services/expenses_api_service.py` · model `products/models/operations.py` (`OperatingExpense`) · migration `0235_seed_expenses_permission` (data only)
> **Frontend contract**: `sharwa-frontend/src/features/expenses/schemas.ts` · hooks `src/features/expenses/api.ts` · fixture `src/mocks/expenses/` · permission list `src/lib/access.ts`
> **Tests**: `sharwa_saas/api/test_expenses_api.py` (**8** tests: `test_gates`, `test_permission_is_seeded_for_admin_roles`, `test_ledger_groups_by_month_with_one_total_per_currency`, `test_filters_and_invalid_values`, `test_pagination_keeps_whole_month_totals`, `test_create_owner_and_staff`, `test_create_validation_messages`, `test_edit_and_delete_are_not_available`) · mock E2E `scripts/expenses-check.ts`
> **Last verified against code**: 2026-10-27 (step 22)

<a id="overview"></a>

## 1. Overview

M33 is a **manual ledger of what running the store costs** — packaging, rent, salaries, other. A merchant (or a staff member who holds the permission) types an expense; the screen lists them grouped by month with one total per currency. Nothing here touches an order or the merchant wallet: it is read only by the M25 `operating_expenses` report and, optionally, by net revenue through an explicit parameter ([architecture/43-ledgers.md §4.2](../../../architecture/43-ledgers.md)).

The ledger is append-only through the API: **no edit and no delete** (FR-33.06). Only two Django routes exist, both under `/api/v1/` on the tenant host; the BFF mirrors them under `/api/bff/expenses` ([BFF](../../overview/bff.md)).

<a id="access"></a>

## 2. Access — gate chain

`ExpensesAPIMixin.guard` is `self.gate(request, 'expenses.manage')` — the same helper as the catalog and marketing modules (`ProductsAPIMixin.gate`).

| # | Gate | Requirement | Failure |
|---|---|---|---|
| 1 | Session | an owner session (`is_merchant_authenticated`) or a resolved staff member | `401` `{"detail": "انتهت جلستك، سجّل الدخول مجدداً."}` |
| 2 | Permission key | a **staff** session must hold `expenses.manage`; the **owner** holds every key implicitly | `403` `{"detail": "ليست لديك صلاحية لهذا الإجراء."}` |
| — | Plan feature | **none** (FR-33.07) | — |

Unlike the payments module ([M14](m14-payments-wallet.md#access)), money entry here is **not owner only**: a store manager can record expenses under her own name.

**The permission** `expenses.manage` («إدارة المصروفات التشغيلية (عرض الدفتر وتسجيل المصروفات)», category «المالية») is created by migration `0235_seed_expenses_permission` and attached to the two system roles **«مدير المتجر»** and **«مدير الفرع»**. The role names matter only for that one-time seeding (once per tenant schema); at run time only the permission code is checked, so a merchant can grant or withdraw it on any role from the roles screen. `test_permission_is_seeded_for_admin_roles` asserts both roles hold it and «كاشير» does not. The migration follows the pattern of `0210_seed_catalog_manage_permission`; its reverse removes the role links and the permission.

`test_gates` asserts: no session ⇒ `401` on `GET` and `POST`; a staff member without the key ⇒ `403` on both; with the key ⇒ `200`; the owner ⇒ `200`.

<a id="summary"></a>

## 3. Endpoint summary

| # | Method | Django path (`/api/v1/…`) | Purpose | Gate | Success |
|---|---|---|---|---|---|
| 1 | `GET` | `expenses/` | ledger grouped by month | session + `expenses.manage` | `200` |
| 2 | `POST` | `expenses/` | record an expense | session + `expenses.manage` | `201` the row |
| 3 | `GET` `PATCH` `PUT` `DELETE` | `expenses/<id>/` | not available | session + `expenses.manage` | `405` |

<a id="list"></a>

## 4. List the ledger — `GET /api/v1/expenses/`

*(DOC-157)*

**Before INT-043** both rows of the inventory were `[NEEDS BACKEND]`. The model `OperatingExpense` already existed — four categories, `Decimal(14, 2)` amount, a `currency` string, an indexed `expense_date`, a free `note`, `created_by` → `StaffMember` (`SET_NULL`) and the ordering `-expense_date, -id` — together with the HTML view `operating_expenses_view` (a list plus `OperatingExpenseForm` on `POST`, session only) and the M25 report. There was **no JSON and no permission key**, so the Next.js screen had to stay owner-only even though its contract carries `created_by_name`. INT-043 added the JSON API and the permission key ([§2](#access)).

**Query parameters**

| Name | Type | Default | Notes |
|---|---|---|---|
| `category` | `packaging` · `rent` · `salaries` · `other` | — | any other value is **ignored** |
| `currency` | `SAR` · `USD` · `YER_OLD` · `YER_NEW` | — | any other value is ignored |
| `from`, `to` | `YYYY-MM-DD` | — | inclusive bounds on `expense_date`; an invalid or impossible date such as `2026-02-30` is ignored, not an error |
| `page` | integer | `1` | below 1 or not a number ⇒ `1`; a page past the end returns `months: []` |

Page size is fixed: **50 entries** (`PAGE_SIZE`, equal to the frontend's).

**Response `200`**

```json
{
  "count": 4,
  "months": [
    {
      "month": "2026-09",
      "totals": [
        {"currency": "SAR", "display_total": "1,280.50 ر.س"},
        {"currency": "YER_NEW", "display_total": "14,000 ر.ي"}
      ],
      "rows": [
        {"id": 3, "category": "other", "display_amount": "14,000 ر.ي", "currency": "YER_NEW", "expense_date": "2026-09-20", "note": "", "created_by_name": "منى القحطاني"},
        {"id": 2, "category": "packaging", "display_amount": "30.50 ر.س", "currency": "SAR", "expense_date": "2026-09-03", "note": "", "created_by_name": null},
        {"id": 1, "category": "rent", "display_amount": "1,250 ر.س", "currency": "SAR", "expense_date": "2026-09-03", "note": "إيجار المستودع", "created_by_name": null}
      ]
    },
    {"month": "2026-08", "totals": [{"currency": "SAR", "display_total": "99.99 ر.س"}], "rows": [{"id": 4, "category": "other", "display_amount": "99.99 ر.س", "currency": "SAR", "expense_date": "2026-08-15", "note": "", "created_by_name": null}]}
  ]
}
```

The values are those of `test_ledger_groups_by_month_with_one_total_per_currency`.

| Field | Type | Meaning |
|---|---|---|
| `count` | integer | rows matching the filters, across **all** pages |
| `months[].month` | `YYYY-MM` | months **present on this page**, newest first |
| `months[].totals[]` | `{currency, display_total}` | one entry per currency the month holds, in the fixed order `SAR`, `USD`, `YER_OLD`, `YER_NEW` (the order of `CURRENCY_CHOICES`) |
| `rows[].id` | integer | |
| `rows[].category` | enum | value as stored; Arabic labels are UI text: تغليف · إيجار · رواتب · أخرى |
| `rows[].display_amount` | string | `format_money(amount, currency)` — the server's string |
| `rows[].currency` | string | |
| `rows[].expense_date` | `YYYY-MM-DD` | |
| `rows[].note` | string | `''` when empty, never `null` |
| `rows[].created_by_name` | string \| null | first non-empty of `full_name`, `name`, `display_name` of the staff member, else «موظف»; **`null` = the owner** (US-33.1.3). A staff member whose service ended keeps their name — the row stays |

**Order.** Rows are sorted `-expense_date, -id` (the same as `OperatingExpense.Meta.ordering`); the page slice is taken from that order and `select_related('created_by')` avoids one query per row.

**Month totals are for the WHOLE filtered month — never just the page** (FR-33.03). After the page rows are chosen, one aggregate query covers every filtered row between the first day of the earliest month and the last day of the latest month on the page: `annotate(m=TruncMonth('expense_date')).values('m', 'currency').annotate(total=Sum('amount')).order_by()` (the empty `order_by()` keeps `Meta.ordering` out of the `GROUP BY`). Each `(month, currency)` sum is formatted by `format_money`; **two currencies are never added together**. The test creates 55 rows of 10 SAR in October and asserts the first page (50 rows) and the second page (5 rows) both carry the total «550 ر.س»; `page=9` returns `months == []`.

**Filters** (`test_filters_and_invalid_values`): `category=rent&from=2026-01-01` ⇒ 2 rows; `currency=USD` ⇒ 1; `to=2025-12-31` ⇒ 1; with `category=fuel&currency=EUR&from=2026-02-30&to=x` all four filters are ignored and `count` is 4. Filters also apply to the totals, so a filtered month shows only the filtered sum: `category=rent&currency=SAR&from=2026-01-01&to=2026-01-31` ⇒ `[{"currency": "SAR", "display_total": "500 ر.س"}]`.

<a id="create"></a>

## 5. Record an expense — `POST /api/v1/expenses/` and `expenses/<id>/`

*(DOC-158)*

### `POST /api/v1/expenses/` (`application/json`)

| Field | Type | Required | Rules and messages |
|---|---|---|---|
| `category` | enum | yes | one of `packaging`, `rent`, `salaries`, `other`, otherwise «اختر فئة صحيحة.» |
| `amount` | string or number | yes | trimmed text matching `^\d+(\.\d{1,2})?$` and ≥ 0.01, otherwise «قيمة المصروف موجبة دائماً.»; ≥ 10¹² ⇒ «المبلغ أكبر من المسموح.». `-5`, `1.234`, `abc` and an empty value all give the first message |
| `currency` | enum | no | **absent or empty ⇒ `SAR`**; a value outside the four codes ⇒ «عملة غير مدعومة.» |
| `expense_date` | `YYYY-MM-DD` | yes | the first 10 characters must be a real calendar date, otherwise «أدخل تاريخاً صحيحاً.»; **a future date is accepted** (§8 of the spec) |
| `note` | string | no | trimmed; more than 500 characters ⇒ «الملاحظة 500 حرف على الأكثر.»; a non-string counts as empty |

Only these five fields are read (FR-33.01); anything else in the body is ignored. All field errors are returned together:

```json
{
  "category": ["اختر فئة صحيحة."],
  "amount": ["قيمة المصروف موجبة دائماً."],
  "currency": ["عملة غير مدعومة."],
  "expense_date": ["أدخل تاريخاً صحيحاً."],
  "note": ["الملاحظة 500 حرف على الأكثر."]
}
```

(`test_create_validation_messages`, sending `fuel`, `0`, `EUR`, `2026-02-30` and 501 characters.)

**Response `201`** — the row, in the shape of the list rows:

```json
{"id": 5, "category": "packaging", "display_amount": "126 ر.ي", "currency": "YER_NEW", "expense_date": "2026-10-26", "note": "أكياس هدايا", "created_by_name": null}
```

(`test_create_owner_and_staff`: amount `'125.50'` is stored as `Decimal('125.50')` and displayed by `format_money` as «126 ر.ي» for the Yemeni rial; the note `'  أكياس هدايا  '` is trimmed; the id is illustrative.)

**Rules**

- The amount is quantized to two decimals before saving.
- **`created_by`** is the staff member resolved from the request (`resolve_request_staff`); for the owner it is `NULL`, shown as `created_by_name: null`. A manager's entry returns «منى القحطاني» in the test.
- The write happens in one `OperatingExpense.objects.create`, with no side effect on any ledger or order.
- A request body that is not a JSON object is treated as empty and fails the required-field checks.

### `GET|PATCH|PUT|DELETE /api/v1/expenses/<id>/` → `405`

All four methods run the same handler: first the gate ([§2](#access)), then

```json
{"detail": "تعديل المصروفات وحذفها غير متاحَين بعد."}
```

with status `405`, whether or not the id exists. There is no edit or delete anywhere in the API (FR-33.06); the test checks `GET`, `PATCH` and `DELETE` on a real id and that the row still exists afterwards. A gate failure (`401`/`403`) answers before the `405`.

### Where the permission shows up

- **Django, HTML**: the legacy `operating_expenses_view` (`dashboard/operating-expenses/`) is decorated `@requires_permission('expenses.manage')` — the same gate as the JSON API; the owner passes implicitly.
- **Frontend**: `src/lib/access.ts` lists `"expenses.manage"` in its permission keys (seeded to «مدير المتجر» + «مدير الفرع», migration `0235`). The mock fixtures follow the same rules (see the script below).
- **Mock E2E**: `scripts/expenses-check.ts` verifies the manager path (`201`, `created_by_name` = «منى القحطاني»), the owner entry (`created_by_name: null`), the cashier (no entry form, `403` from `/api/bff/expenses`), month grouping with two separate currency totals, the 390px layout and the absence of edit/delete controls. Writes go to the `glow` fixture store so the `noor` screenshots stay stable.

**Limitation of this step.** The roadmap also records the sidebar and ⌘K entry `wallet.expenses` moving from `ownerOnly` to `permission: "expenses.manage"` and the mobile «مصروف جديد» bar classes; those component files were not re-read for this page, so they are not asserted here.

<a id="bff"></a>

## 6. BFF row

`/api/bff/expenses/[[...path]]` forwards the path after `expenses/` verbatim (each segment `encodeURIComponent`-ed) and appends Django's trailing slash: `/api/bff/expenses` ⇒ `/api/v1/expenses/`, `/api/bff/expenses/7` ⇒ `/api/v1/expenses/7/`. Live: Django as above. Mock: `src/mocks/expenses` behind `mockRoute` (merchant or staff session). The key register row is 33 in [`architecture/22-live-module-keys.md`](../../../architecture/22-live-module-keys.md) (*1 catch-all*).

<a id="schema-changes"></a>

## 7. Gaps closed, bugs fixed and migrations

- **Migration `0235_seed_expenses_permission`** (depends on `0234_support_api`): `RunPython(seed, unseed)` — `Permission(code='expenses.manage', category='المالية')` via `get_or_create`, and a `RolePermission` for each system role named «مدير المتجر» / «مدير الفرع» that exists. No table changed.
- **Gap closed**: the screen no longer has to be owner-only; the contract's `created_by_name` is now meaningful.
- **Gap closed**: the legacy HTML view and the JSON API share one gate, so a staff member cannot use one to bypass the other.

<a id="open-items"></a>

## 8. Open items and legacy-only behaviour

- No edit and no delete (FR-33.06) — `405` until a later phase.
- The four categories are fixed in code (`OperatingExpense.CATEGORY_CHOICES`); the row has no other field than the five of FR-33.01 plus `created_by` and `created_at`.
- `OperatingExpense.currency` is a plain `CharField(max_length=10, default='SAR')` with no `choices`; the API is what restricts it to the four wallet currencies.

<a id="related"></a>

## 9. Related pages

- Domain overview: [`README.md`](README.md) · the other ledgers: [`m14-payments-wallet.md`](m14-payments-wallet.md) · [`m40-sharwa-pay.md`](m40-sharwa-pay.md)
- Cross-cutting: [permissions](../../overview/permissions.md) · [errors](../../overview/errors.md) · [money](../../overview/money.md) · [pagination](../../overview/pagination.md)
- Architecture: [ledgers](../../../architecture/43-ledgers.md) · [live module keys](../../../architecture/22-live-module-keys.md)
- Merchant guide (Arabic): [`../../../guides/merchant/08-finance/README.md`](../../../guides/merchant/08-finance/README.md)
