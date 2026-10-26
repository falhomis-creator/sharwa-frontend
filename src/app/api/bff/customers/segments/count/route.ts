import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { segmentCount } from "@/mocks/customers/state";

/** `GET /api/v1/customers/segments/count/?segment&product_id` → `{count}` — the live `AUDIENCE_TYPE` size (US-07.5). */
export async function GET(request: Request) {
  return liveOrMock(request, "customers", "/api/v1/customers/segments/count/", () =>
    mockRoute(request, ({ store, url }) => mockJson(segmentCount(store, url.searchParams), { delay: 120 }), { permission: "customers.view" }),
  );
}
