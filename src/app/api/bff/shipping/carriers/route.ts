import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { listCarriers } from "@/mocks/shipping/state";
import { ownerOnly } from "@/app/api/bff/shipping/_guard";

/** `GET /api/v1/shipping/carriers/` → `[{carrier_code, name, is_connected, fields, webhook_url, last_event_at}]` — secrets never leave the server. */
async function mockGET(request: Request) {
  return mockRoute(request, ({ store, storeHost, session }) => ownerOnly(session) ?? mockJson(listCarriers(store, storeHost), { delay: 160 }));
}

// INT-021: `liveOrMock` module `shipping` → Django `api/views_shipping.py`; the fixture handlers above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "shipping", "/api/v1/shipping/carriers/", () => mockGET(request));
}
