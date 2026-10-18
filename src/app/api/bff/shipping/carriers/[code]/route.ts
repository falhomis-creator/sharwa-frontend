import { mockRoute } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { carrierView } from "@/mocks/shipping/state";
import { carrierCode, ownerOnly, unknownCarrier } from "@/app/api/bff/shipping/_guard";

/** One carrier: `credential_fields` (secrets as `has_value` only), webhook URL, last inbound event. */
export async function GET(request: Request, ctx: RouteContext<"/api/bff/shipping/carriers/[code]">) {
  const code = carrierCode((await ctx.params).code);
  return mockRoute(request, ({ store, storeHost, session }) => ownerOnly(session) ?? (code ? mockJson(carrierView(store, storeHost, code), { delay: 140 }) : unknownCarrier()));
}
