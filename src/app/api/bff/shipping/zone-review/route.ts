import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listReview } from "@/mocks/shipping/ops";
import { ownerOnly } from "@/app/api/bff/shipping/_guard";

/** `GET /api/v1/shipping/zone-review/?reason&page` — orders outside every zone or inside a restricted polygon. */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, session, url }) => ownerOnly(session) ?? mockJson(listReview(store, url.searchParams), { delay: 160 }));
}
