import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { putCredentials } from "@/mocks/shipping/state";
import { carrierCode, ownerOnly, unknownCarrier } from "@/app/api/bff/shipping/_guard";

/** `PUT /api/v1/shipping/carriers/<code>/credentials/` — write-only secrets; an empty secret keeps the stored one. */
async function mockPUT(request: Request, ctx: RouteContext<"/api/bff/shipping/carriers/[code]/credentials">) {
  const code = carrierCode((await ctx.params).code);
  return mockRoute(request, async ({ store, storeHost, session }) => ownerOnly(session) ?? (code ? respond(putCredentials(store, storeHost, code, await readBody(request)), { delay: 260 }) : unknownCarrier()));
}

// INT-021: `liveOrMock` module `shipping` → Django `api/views_shipping.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/shipping/carriers/[code]/credentials">;

async function upstream(ctx: Ctx) {
  return `/api/v1/shipping/carriers/${encodeURIComponent((await ctx.params).code)}/credentials/`;
}

export async function PUT(request: Request, ctx: Ctx) {
  return liveOrMock(request, "shipping", await upstream(ctx), () => mockPUT(request, ctx));
}
