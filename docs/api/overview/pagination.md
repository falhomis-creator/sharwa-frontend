# Pagination and list conventions

> **Source**: DOC-034 · INT-005, INT-007, INT-009, INT-017, INT-020, INT-021, INT-024, INT-026, INT-028, INT-029, INT-030, INT-032, INT-035, INT-037, INT-042, INT-043, INT-046, INT-048
> **Code**: the `_page` / `page_params` / `paginate` helper in each `products/services/*_service.py` · `api/views.py` (`ProductPagination`) · `sharwapay/customer_api.py` · `tenants/console_service.py` · `config/settings.py` (`REST_FRAMEWORK`)
> **Frontend**: `src/features/*/schemas.ts` (list envelopes)
> **Last verified against code**: 2026-10-27 (step 04)

There is no single paginator. Each module has its own small helper, written to match the frontend's schema for that screen, so envelopes and limits differ. This page lists them all. The shared rules come first; the per-module table (section 3) is the reference for a specific route.

## 1. Request parameters

| Parameter | Meaning | Rules |
|---|---|---|
| `page` | 1-based page number | a missing, non-numeric or lower-than-1 value becomes `1`. A page past the end returns an empty `results` and the real `count`, never `404` |
| `page_size` | rows per page | a missing or non-numeric value becomes the module default. A value below the minimum becomes the minimum (1, or 10 in inventory). A value above the maximum becomes the maximum. There is no error for an out-of-range size |

Filters (`q`, `status`, `from`, `to`, …) are per route and are documented on the domain pages. They run before the count, so `count` is the filtered total.

Some lists ignore `page_size` because their size is fixed (section 4).

## 2. Response envelopes

| Envelope | Shape | `next` / `previous` | Used by |
|---|---|---|---|
| **A** | `{count, next, previous, results}` | strings such as `"?page=3"`, or `null`. Only the query string, never a full URL | products, orders, customers, notifications, channels, inbox conversations, support, apps, returns list |
| **B** | `{count, next, previous, results}` | **integers** (`3`) or `null` | procurement, dropshipping, marketplaces |
| **C** | `{count, results}` | none. Compute "has more" from `count`, `page` and `page_size` | payments, customer wallets, staff, shipping, marketing, inventory, console, Sharwa Pay transactions |
| **D** | `{count, next, previous, results}` | **full URLs** (DRF `PageNumberPagination`) | storefront catalog `catalog/products/` only |
| **E** | `{…summary, next, results}` | string or `null`, no `count`, no `previous` | storefront product reviews |

Variants that add keys to A or C:

| Variant | Extra keys | Where |
|---|---|---|
| `{count, counts, results}` | `counts`: per-status or per-tab totals for the filter chips | returns `returns/rma/`, courier lists, Sharwa Ship shipments, payment lists |
| `{count, net_delta, results}` | `net_delta`: net stock movement of the filtered range | `inventory/movements/` |
| `{count, display_balance, results}` | `display_balance`: custody balance | courier custody `agent/custody/` |
| `{count, months: [...]}` | `months`: rows grouped by month with per-currency totals | `expenses/` |
| `{topups: [...], withdrawals: [...]}` | no `count`, no page | Sharwa Pay `sharwa-pay/requests/` (newest 100 of each) |

The next link in A is only a query string. Build the next request from your own URL and parameters: take `page + 1`, keep every filter.

> ⚠️ Discrepancy — roadmap lists `{count, results}`, `{count, counts, results}`, `{count, months}` and `{topups[], withdrawals[]}` / the code also uses three `next` formats (string, integer, full URL), a reviews envelope with no `count`, and a catalog envelope that returns absolute URLs. A shared client helper must read `next` as "truthy means more", and build the following request itself.

## 3. Per-module reference

"Max" is the largest `page_size` accepted. Routes are under `/api/v1/`.

| Module | Routes | Default | Max | Envelope |
|---|---|---|---|---|
| Orders | `orders/` | 50 | 100 | A |
| Products (dashboard) | `products/` | 50 | 100 | A |
| Product change history | `products/<pk>/changes/` | 20 (fixed, `page` only) | 20 | A |
| Customers | `customers/` | 50 | 100 | A |
| Customer orders | `customers/<phone>/orders/` | 20 | 100 | A |
| Customer wallets | `customers/wallets/`, `…/<id>/transactions/` | 50 | 100 | C |
| Loyalty points | `loyalty/points/`, `…/<phone>/transactions/` | 50 | 100 | C |
| Notifications | `notifications/` | 30 | 50 | A |
| Inventory | `inventory/`, `items/`, `movements/`, `reservations/`, `writeoffs/` | 50 | 100 (minimum 10) | C (movements adds `net_delta`) |
| Returns | `returns/` | 20 | 100 | A |
| Returns (RMA) | `returns/rma/` | 20 | 100 | `{count, counts, results}` |
| Payments and merchant wallet | `wallet/transactions/`, `wallet/withdrawals/` and the other lists that use the payments paginator | 50 | 100 | C |
| Staff | `staff/`, `approvals/`, `audit-log/`, `behavior-alerts/` | 50 | 100 | C |
| Shipping | `shipping/delivery-methods/`, `packaging-profiles/`, `restricted-zones/`, `sla-rules/` and the other shipping lists | 50 | 100 | C |
| Marketing | `promotions/coupons/`, `offers/`, `campaigns/` | 50 | 100 | C |
| Campaign recipients | `promotions/campaigns/<pk>/` recipients | 100 | 100 | see [`m13-marketing.md`](../domains/07-marketing-design-partners/m13-marketing.md) |
| Channels | `channels/…` lists | 20 | 100 | A |
| Inbox conversations | `inbox/conversations/` | 20 | 100 | A |
| Support | `support/sessions/`, `support/tickets/` | 20 | 100 | A |
| Apps | `apps/…` lists | 20 | 100 | A |
| Procurement | `suppliers/`, `purchase-orders/` | 20 | 200 | B |
| Dropshipping | suppliers, feeds, rules, orders, jobs | 20 | 200 | B |
| Dropshipping catalog | `dropshipping/suppliers/<code>/catalog/` | 24 | 200 | B. The supplier answers with a cursor, not a page number: `next` is `page + 1` while the supplier has more. `count` is the supplier's total when it gives one and an estimate otherwise |
| Marketplaces | `marketplaces/…` lists | listings 25, jobs 20 | 200 | B |
| POS | `pos/products/`, `pos/orders/` | 24 | 100 | see [`m16-pos.md`](../domains/13-channels-operations/m16-pos.md) |
| Expenses | `expenses/` | 50 (fixed) | 50 | `{count, months}` |
| Reports | `reports/<code>/` table | 1000 rows per table page | — | see [`m25-reports.md`](../domains/15-reports/m25-reports.md) |
| Console | `platform/stores/`, `feature-overrides/`, `webhook-events/` | 50 | 100 | C |
| Sharwa Pay (customer) | `sharwa-pay/transactions/` | 20 (fixed; no `page_size`) | 20 | C |
| Storefront catalog | `catalog/products/` | 20 | 50 | D |
| Storefront reviews | `catalog/products/<id>/reviews/` | 5 (fixed) | 5 | E |

The DRF default (`REST_FRAMEWORK.PAGE_SIZE = 20`, `PageNumberPagination`) applies to any class-based list view that does not set its own class. Only `catalog/products/` relies on it, with `ProductPagination` raising `page_size` to a maximum of 50. `catalog/categories/` and the organisation routes (`categories/`, `brands/`, `tags/`, `collections/`, `badges/`) are **not paginated**: they return the whole list.

## 4. Fixed windows and short lists

Some routes return a fixed, newest-first window and have no `page` at all.

| Route | Window |
|---|---|
| `notifications/` | the last 30 days by default. Add `history=1` for older ones (then the page rules apply to all of them). Unread system notices are pinned first |
| `shipping/sharwa-ship/pending-orders/` | newest 50 orders waiting for a waybill |
| `sharwa-pay/requests/` | newest 100 top-ups and newest 100 withdrawals, in two arrays |
| support session timeline | newest 500 items per call (`TIMELINE_LIMIT`), then the cursor (section 5) |
| `agent/custody/`, courier lists | 50 per page |
| `GET reports/…` tables | 1000 rows per page |

## 5. Cursors

Two timelines use a cursor instead of a page, because they poll for what is new.

| Route | Parameter | Cursor | Response |
|---|---|---|---|
| `GET support/sessions/<pk>/` | `?after=<cursor>` | `"<last message id>.<last tool-call id>"`, for example `"41.17"`. Messages and tool calls are two tables that advance separately. A bare integer is accepted for old clients: an even number `2n` means message `n`, an odd number `2n+1` means tool call `n` | `{session, timeline, cursor, can_takeover, ai}`. `timeline` is sorted by time, then id. Store the returned `cursor` and send it as `after` on the next poll |
| `GET inbox/conversations/<pk>/messages/` | `?after=<message id>` | the id of the last message you have. Only digits are read; anything else means "from the start" | a plain **array** of messages (not an envelope), oldest first |

Treat both cursors as opaque and store what the server returned. Do not build one from ids you computed yourself.

## 6. Client rules

1. Send `page` and `page_size` as integers. Stay inside the module's maximum; Django clamps it silently, so a value of 500 on orders gives you 100 rows, not 500.
2. Stop when `next` is `null` (A, B, D, E) or when `page * page_size >= count` (C).
3. Reset to `page=1` whenever a filter or the search text changes. The server does not.
4. Do not parse `next`. In A it is only `?page=N`; in B it is a number; in D it is a full URL on the store host.
5. `count` can change between two pages (new rows arrive). Do not assume that all pages add up to the first `count`.

See [`conventions.md`](conventions.md) for the rest of the API rules and [`errors.md`](errors.md) for error shapes.
