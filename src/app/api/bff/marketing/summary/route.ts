import { mockRoute } from "@/lib/bff/mock-route";
import { marketingSummary } from "@/mocks/marketing/state";
import { mockJson } from "@/mocks/runtime";

/** `GET /api/bff/marketing/summary` — the hub's number strip `[NEEDS BACKEND]` (M13 US-13.1). */
export async function GET(request: Request) {
  return mockRoute(request, ({ store }) => mockJson(marketingSummary(store), { delay: 100 }), { permission: "discounts.apply" });
}
