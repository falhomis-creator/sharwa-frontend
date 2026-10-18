import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listZones, paginate } from "@/mocks/shipping/state";
import { ownerOnly } from "@/app/api/bff/shipping/_guard";

/** `GET /api/v1/shipping/sharwa-ship/zones/` — platform zones, read-only (FR-15.04; M20 manages them). */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, session, url }) => ownerOnly(session) ?? mockJson(paginate(listZones(store), url.searchParams), { delay: 160 }));
}
