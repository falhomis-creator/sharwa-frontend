import { mockRoute, respond } from "@/lib/bff/mock-route";
import { testCarrier } from "@/mocks/shipping/state";
import { carrierCode, ownerOnly, unknownCarrier } from "@/app/api/bff/shipping/_guard";

/** `POST /api/v1/shipping/carriers/<code>/test/` → `{ok, message}` — the reason is the server's, readable as-is. */
export async function POST(request: Request, ctx: RouteContext<"/api/bff/shipping/carriers/[code]/test">) {
  const code = carrierCode((await ctx.params).code);
  return mockRoute(request, ({ store, session }) => ownerOnly(session) ?? (code ? respond(testCarrier(store, code), { delay: 400 }) : unknownCarrier()));
}
