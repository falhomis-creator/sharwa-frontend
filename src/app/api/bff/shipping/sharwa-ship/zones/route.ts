import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listZones, paginate } from "@/mocks/shipping/state";
import { ownerOnly } from "@/app/api/bff/shipping/_guard";

/** `GET /api/v1/shipping/sharwa-ship/zones/` — platform zones, read-only (FR-15.04; M20 manages them). */
async function mockGET(request: Request) {
  return mockRoute(request, ({ store, session, url }) => ownerOnly(session) ?? mockJson(paginate(listZones(store), url.searchParams), { delay: 160 }));
}

// INT-021: `liveOrMock` module `shipping` → Django `api/views_shipping.py`; the fixture handlers above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "shipping", "/api/v1/shipping/sharwa-ship/zones/", () => mockGET(request));
}
