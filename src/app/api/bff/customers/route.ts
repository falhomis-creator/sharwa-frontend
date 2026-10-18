import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listCustomers } from "@/mocks/customers/state";

/**
 * `GET /api/v1/customers/?q&segment&product_id&last_order_from&last_order_to&min_spent&trust&has_wallet&has_points&ordering&page&page_size`
 * → `{count, next, previous, results}` — M07 §7, `[NEEDS BACKEND]` (today `customer_report` HTML).
 * The customer is derived from orders, keyed by the normalised phone (FR-07.01).
 */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, url }) => mockJson(listCustomers(store, url.searchParams), { delay: 220 }), { permission: "customers.view" });
}
