import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, respond } from "@/lib/bff/mock-route";
import { testCarrier } from "@/mocks/shipping/state";
import { carrierCode, ownerOnly, unknownCarrier } from "@/app/api/bff/shipping/_guard";

/** `POST /api/v1/shipping/carriers/<code>/test/` → `{ok, message}` — the reason is the server's, readable as-is. */
async function mockPOST(request: Request, ctx: RouteContext<"/api/bff/shipping/carriers/[code]/test">) {
  const code = carrierCode((await ctx.params).code);
  return mockRoute(request, ({ store, session }) => ownerOnly(session) ?? (code ? respond(testCarrier(store, code), { delay: 400 }) : unknownCarrier()));
}

// INT-021: `liveOrMock` module `shipping` → Django `api/views_shipping.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/shipping/carriers/[code]/test">;

async function upstream(ctx: Ctx) {
  return `/api/v1/shipping/carriers/${encodeURIComponent((await ctx.params).code)}/test/`;
}

export async function POST(request: Request, ctx: Ctx) {
  return liveOrMock(request, "shipping", await upstream(ctx), () => mockPOST(request, ctx));
}
