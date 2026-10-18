import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { putCredentials } from "@/mocks/shipping/state";
import { carrierCode, ownerOnly, unknownCarrier } from "@/app/api/bff/shipping/_guard";

/** `PUT /api/v1/shipping/carriers/<code>/credentials/` — write-only secrets; an empty secret keeps the stored one. */
export async function PUT(request: Request, ctx: RouteContext<"/api/bff/shipping/carriers/[code]/credentials">) {
  const code = carrierCode((await ctx.params).code);
  return mockRoute(request, async ({ store, storeHost, session }) => ownerOnly(session) ?? (code ? respond(putCredentials(store, storeHost, code, await readBody(request)), { delay: 260 }) : unknownCarrier()));
}
