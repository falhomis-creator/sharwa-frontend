import { liveOrMock } from "@/lib/bff/live-route";
import { readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { getGateway, setGatewayEnabled } from "@/mocks/payments/state";
import { ownerRoute } from "@/mocks/payments/routes";

type Ctx = RouteContext<"/api/bff/payments/gateways/[code]">;

/** `GET` one gateway, `PATCH /api/v1/payments/gateways/<code>/` `{is_enabled}` (M14 §7, FR-14.05). */
async function mockGET(request: Request, { params }: Ctx) {
  const { code } = await params;
  return ownerRoute(request, ({ store }) => {
    const g = getGateway(store, code);
    return g ? mockJson(g, { delay: 150 }) : mockJson({ detail: "البوابة غير معروفة." }, { status: 404 });
  });
}

async function mockPATCH(request: Request, { params }: Ctx) {
  const { code } = await params;
  return ownerRoute(request, async ({ store }) => respond(setGatewayEnabled(store, code, await readBody(request)), { delay: 220 }));
}

// INT-020: `liveOrMock` module `payments` → Django `api/views_payments.py`; the fixture handlers above otherwise.
async function upstream(ctx: Ctx) {
  return `/api/v1/payments/gateways/${encodeURIComponent((await ctx.params).code)}/`;
}

export async function GET(request: Request, ctx: Ctx) {
  return liveOrMock(request, "payments", await upstream(ctx), () => mockGET(request, ctx));
}

export async function PATCH(request: Request, ctx: Ctx) {
  return liveOrMock(request, "payments", await upstream(ctx), () => mockPATCH(request, ctx));
}
