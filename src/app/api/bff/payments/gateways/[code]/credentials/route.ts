import { liveOrMock } from "@/lib/bff/live-route";
import { readBody, respond } from "@/lib/bff/mock-route";
import { saveCredentials } from "@/mocks/payments/state";
import { ownerRoute } from "@/mocks/payments/routes";

type Ctx = RouteContext<"/api/bff/payments/gateways/[code]/credentials">;

/** `PUT /api/v1/payments/gateways/<code>/credentials/` `{<field>: value}` — empty fields keep the stored value → 204 (M14 §7). */
async function mockPUT(request: Request, { params }: Ctx) {
  const { code } = await params;
  return ownerRoute(request, async ({ store }) => respond(saveCredentials(store, code, await readBody(request)), { delay: 320 }));
}

// INT-020: `liveOrMock` module `payments` → Django; the fixture handler above otherwise.
export async function PUT(request: Request, ctx: Ctx) {
  const code = encodeURIComponent((await ctx.params).code);
  return liveOrMock(request, "payments", `/api/v1/payments/gateways/${code}/credentials/`, () => mockPUT(request, ctx));
}
