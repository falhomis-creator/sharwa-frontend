import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { patchShippingSettings, shippingSettings } from "@/mocks/shipping/state";
import { ownerOnly } from "@/app/api/bff/shipping/_guard";

/** `GET/PATCH /api/v1/shipping/settings/` `{default_delivery_fee, free_shipping_threshold}` (YER_NEW) — M15 §7, `[NEEDS BACKEND]`; stored in the M34 settings row. */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, storeHost, session }) => ownerOnly(session) ?? mockJson(shippingSettings(store, storeHost), { delay: 140 }));
}

export async function PATCH(request: Request) {
  return mockRoute(request, async ({ store, storeHost, session }) => ownerOnly(session) ?? respond(patchShippingSettings(store, storeHost, await readBody(request)), { delay: 220 }));
}
