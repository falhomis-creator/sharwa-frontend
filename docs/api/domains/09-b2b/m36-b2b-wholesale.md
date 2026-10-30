# B2B wholesale API — M36 (البيع بالجملة B2B)

> **Source**: DOC-165, DOC-166, DOC-167, DOC-168 · INT-044 (M36), INT-013, INT-045, INT-007, INT-022 · inventory Domain 9, A.11
> **Live key**: `b2b` (`SHARWA_LIVE_MODULES`) for the form options and the tier-price editor rows; the draft rows themselves are the transparent `/api/v1/orders/b2b-*` passthrough (Django-first, no switch).
> **Django provider**: `sharwa_saas/api/views_b2b.py` + `products/services/b2b_api_service.py` (options, tier prices) · `products/services/tier_pricing.py` (the shared unit-price rule) · `api/views.py:395-577` (draft create / list / resolve) · `api/serializers.py:333-359` (`B2BDraftSerializer`)
> **Frontend contract**: `sharwa-frontend/src/features/b2b/schemas.ts` (`b2bOptionsSchema`, `b2bDraftSchema`, `b2bCreatedSchema`, `b2bResolvedSchema`) · tier prices `src/features/products/schemas/extras.ts` · fixtures `src/mocks/b2b/`, `src/mocks/product-extras/` · BFF `src/app/api/bff/b2b/[[...path]]/route.ts` + `B2B_LIVE_RULES` in `src/lib/bff/live-products.ts`
> **Tests**: `sharwa_saas/api/test_b2b_api.py` (8 `def test_` methods) · mock E2E `scripts/b2b-check.ts` (with a `requireMocks()` preflight that asserts the `x-sharwa-mock` header)
> **Last verified against code**: 2026-10-28 (step 43)

## 1. Overview

B2B wholesale in Sharwa is **quantity prices plus approval-gated orders**. A staff member builds a draft order for a wholesale customer; every line is priced by the product's quantity-price table (the same rule the storefront cart charges); the draft waits in the M18 approval queue until a manager resolves it, and the linked `Order` follows the decision. Quantity prices are also shown on the product page and charged to any retail buyer who reaches the threshold quantity.

## 2. Access — gate chain

The three view families have different gates; the first failure answers (see [`../overview/conventions.md`](../../overview/conventions.md)).

| Route family | # | Gate | Requirement | Failure |
|---|---|---|---|---|
| `orders/b2b-options/` | 1 | Session | owner or staff session | `401` |
| | 2 | Permission key | `orders.create_b2b` **OR** `orders.approve_b2b` (either passes; owner holds all) | `403` `{"detail": "ليست لديك صلاحية لهذا الإجراء."}` |
| `products/<id>/tier-prices/…` | 1 | Session | owner or staff session | `401` |
| | 2a | Permission key (read) | `inventory.view` — like reading the product itself | `403` «ليست لديك صلاحية لهذا الإجراء.» |
| | 2b | Permission key (write) | `catalog.manage` | `403` «ليست لديك صلاحية لهذا الإجراء.» |
| | 3 | Resource state | product exists | `404` `{"detail": "المنتج غير موجود."}` |
| `orders/b2b-draft*` | 1 | Session | owner or staff session | `401` |
| | 2 | Staff identity (create) | a `StaffMember` is attached to the session — `ApprovalRequest.requested_by` is a required FK | `403` `{"detail": "يتطلب إنشاء طلب الجملة تسجيل دخول موظف."}` |
| | 3 | Permission key | create: `orders.create_b2b`; list: either key (staff without either → `403` «لا تملك صلاحية تنفيذ هذا الإجراء.»); resolve: `orders.approve_b2b` | `403` |

There is **no plan-feature gate** on any B2B route (the permission keys are the whole gate).

<a id="live-session-gap"></a>
> ⚠️ Discrepancy — found in the Step 51 live run ([`../../_verification.md`](../../_verification.md#f-1)) — the table above says gate 1 of `orders/b2b-draft*` accepts "owner or staff session" / code does: the three draft views use `MerchantAPIMixin.check_merchant` (`api/views.py:369-376`), which requires `session["is_merchant_authenticated"]`. A real staff login removes that flag (`api/views_auth.py`, `StaffLoginView`: `session.pop("is_merchant_authenticated", None)`) and sets `_staff_id` instead, so **every staff session** gets `401` `{"detail": "غير مصرح لك بالوصول."}` on `POST orders/b2b-draft/`, `GET orders/b2b-drafts/` and `POST orders/b2b-draft/<id>/resolve/`, while the owner gets `403` «يتطلب إنشاء طلب الجملة تسجيل دخول موظف.» on create. On a live stack nobody can create a draft through the API; listing and resolving work for the owner only. `api/test_b2b_api.py` does not catch it because its `call()` helper builds a session with **both** `is_merchant_authenticated = True` and `request.staff` (a state no login produces). Code fix for fares (outside the documentation phase): let `check_merchant` accept `request.staff`, as `ProductsAPIMixin.gate()` does.

## 3. Endpoint summary

| Method | Django path (`/api/v1/…`) | BFF path | Purpose | Gate (write) |
|---|---|---|---|---|
| `GET` | `orders/b2b-options/` | `api/bff/b2b/options` | choices for the draft form | read |
| `GET` | `products/<id>/tier-prices/` | `api/bff/products/<id>/extras/tier-prices` | list thresholds | `inventory.view` |
| `POST` | `products/<id>/tier-prices/` | same | add a threshold → 201 the new list | `catalog.manage` |
| `DELETE` | `products/<id>/tier-prices/<tier_id>/` | same + `/<tier_id>` | delete a threshold → the new list | `catalog.manage` |
| `POST` | `orders/b2b-draft/` | passthrough | create a draft → 201 | `orders.create_b2b` |
| `GET` | `orders/b2b-drafts/` | passthrough | pending drafts | either key |
| `POST` | `orders/b2b-draft/<approval_id>/resolve/` | passthrough | approve / reject | `orders.approve_b2b` |

## 4. Endpoint groups

<a id="options"></a>

### 4.1 Draft-form choices — `#options`

#### `GET /api/v1/orders/b2b-options/`

Everything the draft form needs in one call (`b2b_options`, `b2b_api_service.py:38-49`):

```json
{
  "roles": [
    { "id": 3, "name": "مدير المتجر" },
    { "id": 7, "name": "مشتريات" }
  ],
  "locations": [
    { "id": 1, "name": "الفرع الرئيسي" },
    { "id": 4, "name": "مستودع صنعاء" }
  ],
  "multi_location": true,
  "default_currency": "SAR"
}
```

| Field | Type | Meaning (Django source) |
|---|---|---|
| `roles` | array | approver roles for the draft: `Role` rows with `is_active = true`, **system roles first** (`order_by('-is_system_role', 'name', 'id')`), as `{id, name}` |
| `locations` | array | branches/warehouses: active `Location` rows by `sort_order`, `name`, `id` |
| `multi_location` | boolean | `StoreSetting.multi_location_enabled` — the form requires an explicit branch when true (§4.4) |
| `default_currency` | string | the store's currency if it is one of the four supported codes, else `SAR` |

**BFF** — `api/bff/b2b/[[...path]]/route.ts` forwards exactly `options` via `liveOrMock(request, "b2b", "/api/v1/orders/b2b-options/", mock)`; every other path under `api/bff/b2b/` — the mock-only `_test/bump/<approval_id>` escalation hook used by `scripts/b2b-check.ts` — is answered by the fixture without touching Django.

**Errors** — `401` (no session), `403` «ليست لديك صلاحية لهذا الإجراء.» (staff without either permission key).

<a id="tier-prices"></a>

### 4.2 Quantity prices — `#tier-prices`

#### `GET /api/v1/products/<id>/tier-prices/`

The product's thresholds, ascending by quantity (`_view`, `b2b_api_service.py:60-69`):

```json
[
  { "id": 11, "min_quantity": 5, "price": "95.00", "display_price": "95 ر.س" },
  { "id": 12, "min_quantity": 12, "price": "90.00", "display_price": "90 ر.س" },
  { "id": 13, "min_quantity": 50, "price": "82.50", "display_price": "82.50 ر.س" }
]
```

`price` is the stored decimal as text; `display_price` is `format_money(price, product.currency)` — the product's own currency, never re-formatted by the browser. Gate: `inventory.view` (like the product itself). Unknown product → `404` `{"detail": "المنتج غير موجود."}`.

#### `POST /api/v1/products/<id>/tier-prices/`

**Request body** (`application/json`): `{ "min_quantity": "12", "price": "90.00" }` (integers-as-strings like the contract's editor).

**Response `201`** — the whole refreshed list (same shape as the GET). A threshold is **unique per quantity**: one row per `min_quantity`.

**Errors** (`400` `{field: [message]}`, verbatim):

| Body | When |
|---|---|
| `{"min_quantity": ["أدخل عدداً صحيحاً موجباً."]}` | not a positive integer (or > 2 147 483 647) |
| `{"min_quantity": ["يوجد سعر لهذه الكمية مسبقاً."]}` | a threshold with this `min_quantity` exists — also the answer when two racing inserts hit the `unique_product_tier_quantity` constraint (`IntegrityError` inside `atomic()`, `:97-101`) |
| `{"price": ["أدخل سعراً صحيحاً."]}` | not `^\d+(\.\d{1,2})?$`, zero, or ≥ 100 000 000 |

#### `DELETE /api/v1/products/<id>/tier-prices/<tier_id>/`

Deletes one threshold; the response is the refreshed list. Unknown threshold → `404` `{"detail": "السعر غير موجود."}`.

**Change log** — every add and delete writes a `ProductChangeLog` row for the product with `field_name = 'tier_prices'` (`old_value`/`new_value` like `«12+ → 90.00»`, the "before" on delete, the "after" on add) under the actor's name (owner or staff username, ≤ 150 chars) — the same trail the mock shows (`_log`, `:72-75`).

**BFF rule** — `B2B_LIVE_RULES` (`src/lib/bff/live-products.ts:75-78`) maps `products/<id>/extras/tier-prices[/<tier_id>]` 1:1 onto these Django routes under the **`b2b`** key, independent of the `products` switch (the other editor extras moved with INT-045).

<a id="unit-price-precedence"></a>

### 4.3 The shared unit-price rule — `#unit-price-precedence`

**Gap closed (INT-044)**: before Phase 002 the product page *showed* quantity prices but the cart never charged them. One function now answers "which unit price applies to this quantity?" for every consumer:

`unit_price(product, quantity, currency, store_setting, tiers=None)` (`products/services/tier_pricing.py:33-38`) resolves, in order:

1. **Variant** → the variant's own price (variants never have tier prices — same order as the PDP: variant ?? tier ?? base);
2. **Formula-priced product** → the formula path `get_converted_price` (no tier prices apply);
3. **Otherwise** → the highest `min_quantity` threshold ≤ quantity, else `Product.price` (a non-numeric quantity or `< 1` also falls to the base price).

The chosen base is converted to the requesting `currency` through the store's exchange-rate settings. `tiers` accepts a prefetched list so a whole cart costs no extra query per line.

**Consumers**:

- **`Cart.__iter__`** — the storefront cart (`GET /api/v1/cart/`) and checkout price every line with `unit_price`, with `tier_prices` prefetched on the products and the import kept local inside `__iter__` to avoid a circular import. What the PDP promised is what the buyer pays.
- **The B2B draft** — each line is stored at `unit_price(product, qty, currency, store_setting)` where `currency` is the draft's currency: the tier price is **converted from the product's currency to the draft's** (before INT-044 the raw product number in another currency was stored). The draft never trusts a price from the request body (§4.4).

<a id="drafts"></a>

### 4.4 B2B drafts — `#drafts`

Three passthrough rows: the browser calls `/api/v1/orders/b2b-*` directly (they were «Ready» rows before Phase 002); POST bodies reach Django intact since the `upstream.ts` request-buffering fix.

#### `POST /api/v1/orders/b2b-draft/` — create

**Request body** (`application/json`):

| Field | Type | Required | Rules |
|---|---|---|---|
| `customer_name` | string | yes | «اسم العميل وهاتفه وعنوانه مطلوبة.» when any of the three is empty |
| `customer_phone` | string | yes | as above |
| `address` | string | yes | as above |
| `items` | array | yes | ≥ 1 line («يجب تحديد منتج واحد على الأقل.»); each `{product_id, quantity}` |
| `approver_role_id` | integer | no | an existing `Role`; default = the system role «مدير المتجر» («دور المعتمد غير موجود.» / «حدّد دور المعتمد (approver_role_id).» when the default role does not exist) |
| `location_id` | integer | no | an **active** location («الفرع غير موجود.») |
| `currency` | string | no | default `SAR`, upper-cased; only the four supported codes — anything else: «عملة غير مدعومة.» |

**Branch rules** (gap 4 closed): in a **multi-location store** the branch must be given explicitly — a draft without `location_id` is refused with «لا يوجد فرع متاح — أنشئ فرعاً أولاً أو حدّد location_id.» (the legacy code silently took the first branch); in a single-location store the first active branch is attached. Only active branches are accepted in both cases.

**Zero-trust pricing**: line prices come from the database through `unit_price` (§4.3) — any price in the request body is ignored. Line errors: «منتج غير صالح: 41» (the invalid product id) and «الكمية يجب أن تكون عدداً صحيحاً موجباً.» (`400`).

**Response `201`**:

```json
{
  "detail": "أُنشئت المسودة وهي الآن بانتظار موافقة المدير.",
  "order_id": 1042,
  "approval_id": 17
}
```

The order is created `status = 'new'`, `payment_status = 'unpaid'`, `sales_channel = 'b2b_draft'`, `total_price = subtotal` (no delivery fees yet), and an `ApprovalRequest` (`request_type = 'order_approval'`) is opened through `order_approval_service.create_b2b_draft_order` with `requested_by` = the creating staff member (hence the staff-session gate) and the chosen approver role.

#### `GET /api/v1/orders/b2b-drafts/` — the queue

Visible with **either** `orders.create_b2b` **or** `orders.approve_b2b` (gap 2 closed — the approver who cannot create still needs the list); a staff member with neither gets `403` «لا تملك صلاحية تنفيذ هذا الإجراء.»; the owner always passes. Rows: orders with `sales_channel = 'b2b_draft'` and a **pending** approval, **escalated first, then newest** (`order_by(F('pending_approval__escalated_at').desc(nulls_last=True), '-created_at')` — gap 3). Row shape (`B2BDraftSerializer`):

```json
{
  "id": 1042,
  "customer_name": "متجر النور للتجزئة",
  "customer_phone": "9677XXXXXXXX",
  "total_price": "11340.00",
  "currency": "SAR",
  "created_at": "2026-10-27T09:14:03+00:00",
  "sales_channel": "b2b_draft",
  "approval_id": 17,
  "approval_version": 3,
  "items_count": 4,
  "created_by_name": "أمين المخزن سامي",
  "escalated_at": "2026-10-27T10:00:00+00:00"
}
```

`created_by_name` is the requester (`approval.requested_by`), falling back to `created_by_staff` — the contract uses it to disable the resolve buttons on your own draft (FR-36.05). `approval_version` is the `ApprovalRequest.version` to send back on resolve.

#### `POST /api/v1/orders/b2b-draft/<approval_id>/resolve/` — decide

**Request body**: `{"decision": "approved" | "rejected", "version": <approval_version>}` — the decision must be one of the two («القرار يجب أن يكون approved أو rejected.») and `version` must be a valid integer («قيمة الإصدار (version) مطلوبة وصحيحة.»).

- Unknown approval id → `404` `{"detail": "طلب الموافقة غير موجود."}` (gap 5 closed — it used to be a silent 500).
- The decision runs through `order_approval_service.resolve_order_approval`, so the **linked order follows it** (approved → proceeds as a real order; rejected → cancelled) and the M18 queue, audit trail and notifications behave exactly as for any approval (INT-022).
- Resolving your **own** request → `403` (rule #16, the resolver must differ from the requester — the owner may).
- A stale `version` → `409` with the concurrency message of `ApprovalRequest.resolve`.

**Response `200`**: `{"detail": "حُسمت الموافقة بنجاح.", "decision": "approved"}`.

**Frontend and mock notes** — the fixture router refuses an unsupported currency exactly like Django; `.env.example` documents `b2b`; `scripts/b2b-check.ts` runs a `requireMocks()` preflight asserting the `x-sharwa-mock` header before exercising the flow.

**Tests** — `api/test_b2b_api.py` (8): `test_gate_and_payload`, `test_crud_messages_and_change_log`, `test_permissions`, `test_highest_threshold_not_above_quantity`, `test_cart_line_uses_tier_price`, `test_tier_price_currency_and_branch_rules`, `test_list_for_approver_with_creator_and_escalation`, `test_resolve_unknown_approval_is_arabic_404`.

## 5. Gaps closed, bugs fixed and migrations

- **No migration.** `ProductTierPrice` and the approval/order tables predate INT-044; the whole domain is behaviour: quantity prices actually charged (gap 1), tier prices stored converted into the draft's currency, currency whitelist, explicit branch in multi-location stores (gap 4), list visible to approvers (gap 2), escalation-first ordering (gap 3), and the Arabic 404 on unknown approvals (gap 5).
- **A.13 re-audit**: the `ready-api-v1.md` «Ready» rows for these paths changed response shape (list fields, resolve contract); their re-audit is tracked as an open item for the verification track.

## 6. Open items and legacy-only behaviour

- **Live gap (Step 51):** staff sessions are refused with `401` on the three draft routes — see [the call-out in §2](#live-session-gap). Until the code is fixed, B2B drafts cannot be created through the dashboard.
- `NegotiationDraft` (haggling) has no screen and no route — see the [domain README](README.md).
- The legacy HTML B2B screen remains server-rendered alongside the API; both call the same services.

## 7. Related pages

- [`../../overview/conventions.md`](../../overview/conventions.md) · [`../05-storefront/README.md`](../05-storefront/README.md) (cart/checkout that charge tier prices) · [`../12-settings-staff-integrations/README.md`](../12-settings-staff-integrations/README.md) (the M18 approval queue) · [`../03-catalog/README.md`](../03-catalog/README.md) (the product the thresholds hang on)
