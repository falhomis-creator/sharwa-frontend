import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { patchShippingSettings, shippingSettings } from "@/mocks/shipping/state";
import { ownerOnly } from "@/app/api/bff/shipping/_guard";

/** `GET/PATCH /api/v1/shipping/settings/` `{default_delivery_fee, free_shipping_threshold}` (YER_NEW) — M15 §7, `live: INT-021`; stored in the M34 settings row. */
async function mockGET(request: Request) {
  return mockRoute(request, ({ store, storeHost, session }) => ownerOnly(session) ?? mockJson(shippingSettings(store, storeHost), { delay: 140 }));
}

async function mockPATCH(request: Request) {
  return mockRoute(request, async ({ store, storeHost, session }) => ownerOnly(session) ?? respond(patchShippingSettings(store, storeHost, await readBody(request)), { delay: 220 }));
}

// INT-021: `liveOrMock` module `shipping` → Django `api/views_shipping.py`; the fixture handlers above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "shipping", "/api/v1/shipping/settings/", () => mockGET(request));
}

export async function PATCH(request: Request) {
  return liveOrMock(request, "shipping", "/api/v1/shipping/settings/", () => mockPATCH(request));
}
