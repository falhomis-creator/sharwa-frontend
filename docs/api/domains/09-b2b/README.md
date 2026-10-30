# B2B wholesale — البيع بالجملة B2B

> Domain 09 — modules M36. Source: DOC-164 · INT-044 (M36) · inventory Domain 9 + A.2 + A.3.
> Page status: written in official Step 43 (2026-10-28).

Wholesale selling has two halves that came online together in Phase 002 (INT-044):

1. **Quantity (tier) prices** — a catalog extension: per-product price thresholds (`ProductTierPrice`, unique `min_quantity` per product, in the product's currency) that the cart, checkout and B2B drafts all charge through one decision function, `products/services/tier_pricing.py:unit_price`. Managed from the product editor.
2. **B2B draft orders** — orders created by a staff member (`sales_channel = 'b2b_draft'`) that wait in the M18 approval queue ([Domain 12](../12-settings-staff-integrations/README.md)) until a manager with the right role approves or rejects them; the linked `Order` follows the decision.

Everything is on the `b2b` live switch except the drafts themselves, which were already Django's before Phase 002 and go through the transparent `/api/v1/*` passthrough.

## Routes in this domain

| Method | Django path (`/api/v1/…`) | BFF path | Purpose | Page |
|---|---|---|---|---|
| `GET` | `orders/b2b-options/` | `api/bff/b2b/options` (live key `b2b`) | draft-form choices: approver roles, branches, multi-location flag, default currency | [`m36-b2b-wholesale.md#options`](m36-b2b-wholesale.md#options) |
| `GET`, `POST` | `products/<id>/tier-prices/` | `api/bff/products/<id>/extras/tier-prices` (live key `b2b`) | list / add a quantity-price threshold | [`m36-b2b-wholesale.md#tier-prices`](m36-b2b-wholesale.md#tier-prices) |
| `DELETE` | `products/<id>/tier-prices/<tier_id>/` | `api/bff/products/<id>/extras/tier-prices/<tier_id>` | delete a threshold | [`m36-b2b-wholesale.md#tier-prices`](m36-b2b-wholesale.md#tier-prices) |
| `POST` | `orders/b2b-draft/` | transparent passthrough (Django-first, no switch) | create a draft order awaiting approval | [`m36-b2b-wholesale.md#drafts`](m36-b2b-wholesale.md#drafts) |
| `GET` | `orders/b2b-drafts/` | passthrough | the pending drafts queue | [`m36-b2b-wholesale.md#drafts`](m36-b2b-wholesale.md#drafts) |
| `POST` | `orders/b2b-draft/<approval_id>/resolve/` | passthrough | approve / reject a draft | [`m36-b2b-wholesale.md#drafts`](m36-b2b-wholesale.md#drafts) |

- **Live switch**: the BFF maps `products/<id>/extras/tier-prices[/<tier_id>]` to Django's `tier-prices` routes through `B2B_LIVE_RULES` (`src/lib/bff/live-products.ts:75-78`) — switched by the `b2b` key, **independent of `products`** (the other extras moved to their own switch with INT-045). `api/bff/b2b/options` uses `liveOrMock(…, "b2b", …)`; anything else under `api/bff/b2b/` (the mock-only `_test/bump` hook of `scripts/b2b-check.ts`) stays on the fixture. `.env.example` lists `b2b`.
- **Providers**: `products/services/b2b_api_service.py` (options + tier prices) · `api/views_b2b.py` · `products/services/tier_pricing.py` (the shared unit-price rule) · `api/views.py` (`B2BDraftCreateView` / `B2BDraftListView` / `B2BDraftResolveView`).
- **No migration** belongs to this domain: `ProductTierPrice`, `ApprovalRequest` and the order tables predate Phase 002; INT-044 added behaviour only.

## Open item

- **Haggling drafts (`NegotiationDraft`) have no screen** — the model exists but nothing was built or wired for it (M36 §10). Recorded in the inventory as an open item, not covered by any route in this domain.

Back to the [documentation home](../../../README.md).
