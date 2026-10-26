import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, respond } from "@/lib/bff/mock-route";
import { verifyDomain } from "@/mocks/integrations/domains";
import { idFrom, ownerOnly } from "@/mocks/integrations/guard";

/** `POST /api/v1/domains/<id>/verify/` `[INT-023]` — «تحقّق الآن» (US-19.1.3). */
async function mockPOST(request: Request, { params }: RouteContext<"/api/bff/domains/[id]/verify">) {
  const id = idFrom((await params).id);
  return mockRoute(request, ({ store, session }) => ownerOnly(session, "النطاقات") ?? respond(verifyDomain(store, id)));
}

// INT-023: `liveOrMock` module `integrations` → Django `api/views_integrations.py`; the fixture handlers above otherwise.
type Ctx = RouteContext<"/api/bff/domains/[id]/verify">;
async function upstream(ctx: Ctx) {
  const { id } = await ctx.params;
  return `/api/v1/domains/${encodeURIComponent(id)}/verify/`;
}
export async function POST(request: Request, ctx: Ctx) {
  return liveOrMock(request, "integrations", await upstream(ctx), () => mockPOST(request, ctx));
}
