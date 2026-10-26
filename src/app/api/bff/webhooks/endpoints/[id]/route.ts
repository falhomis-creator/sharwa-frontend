import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { idFrom, ownerOnly } from "@/mocks/integrations/guard";
import { deleteEndpoint, getEndpoint, patchEndpoint } from "@/mocks/integrations/webhooks";

/** `GET|PATCH|DELETE /api/v1/webhooks/endpoints/<id>/` `[INT-023]` (US-19.3). */
type Ctx = RouteContext<"/api/bff/webhooks/endpoints/[id]">;
async function mockGET(request: Request, { params }: Ctx) {
  const id = idFrom((await params).id);
  return mockRoute(request, ({ store, session }) => ownerOnly(session, "الـ Webhooks") ?? respond(getEndpoint(store, id)));
}
async function mockPATCH(request: Request, { params }: Ctx) {
  const id = idFrom((await params).id);
  return mockRoute(request, async ({ store, session }) => ownerOnly(session, "الـ Webhooks") ?? respond(patchEndpoint(store, id, await readBody(request))));
}
async function mockDELETE(request: Request, { params }: Ctx) {
  const id = idFrom((await params).id);
  return mockRoute(request, ({ store, session }) => ownerOnly(session, "الـ Webhooks") ?? respond(deleteEndpoint(store, id)));
}

// INT-023: `liveOrMock` module `integrations` → Django `api/views_integrations.py`; the fixture handlers above otherwise.
async function upstream(ctx: Ctx) {
  const { id } = await ctx.params;
  return `/api/v1/webhooks/endpoints/${encodeURIComponent(id)}/`;
}
export async function GET(request: Request, ctx: Ctx) {
  return liveOrMock(request, "integrations", await upstream(ctx), () => mockGET(request, ctx));
}
export async function PATCH(request: Request, ctx: Ctx) {
  return liveOrMock(request, "integrations", await upstream(ctx), () => mockPATCH(request, ctx));
}
export async function DELETE(request: Request, ctx: Ctx) {
  return liveOrMock(request, "integrations", await upstream(ctx), () => mockDELETE(request, ctx));
}
