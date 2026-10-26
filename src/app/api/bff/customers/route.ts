import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listCustomers } from "@/mocks/customers/state";

/**
 * `GET /api/v1/customers/?q&segment&product_id&last_order_from&last_order_to&min_spent&trust&has_wallet&has_points&ordering&page&page_size`
 * → `{count, next, previous, results}` — M07 §7, Django `api/views_customers.py` since INT-017 (module `customers`).
 * The customer is derived from orders, keyed by the normalised phone (FR-07.01).
 */
export async function GET(request: Request) {
  return liveOrMock(request, "customers", "/api/v1/customers/", () =>
    mockRoute(request, ({ store, url }) => mockJson(listCustomers(store, url.searchParams), { delay: 220 }), { permission: "customers.view" }),
  );
}
