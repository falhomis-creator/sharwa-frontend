import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { carrierView } from "@/mocks/shipping/state";
import { carrierCode, ownerOnly, unknownCarrier } from "@/app/api/bff/shipping/_guard";

/** One carrier: `credential_fields` (secrets as `has_value` only), webhook URL, last inbound event. */
async function mockGET(request: Request, ctx: RouteContext<"/api/bff/shipping/carriers/[code]">) {
  const code = carrierCode((await ctx.params).code);
  return mockRoute(request, ({ store, storeHost, session }) => ownerOnly(session) ?? (code ? mockJson(carrierView(store, storeHost, code), { delay: 140 }) : unknownCarrier()));
}

// INT-021: `liveOrMock` module `shipping` → Django `api/views_shipping.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/shipping/carriers/[code]">;

async function upstream(ctx: Ctx) {
  return `/api/v1/shipping/carriers/${encodeURIComponent((await ctx.params).code)}/`;
}

export async function GET(request: Request, ctx: Ctx) {
  return liveOrMock(request, "shipping", await upstream(ctx), () => mockGET(request, ctx));
}
