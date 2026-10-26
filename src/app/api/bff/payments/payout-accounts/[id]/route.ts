import { liveOrMock } from "@/lib/bff/live-route";
import { readBody, respond } from "@/lib/bff/mock-route";
import { deleteAccount, updateAccount } from "@/mocks/payments/state";
import { ownerRoute } from "@/mocks/payments/routes";

type Ctx = RouteContext<"/api/bff/payments/payout-accounts/[id]">;

/** `PATCH/DELETE /api/v1/payments/payout-accounts/<id>/` — delete of an account tied to a pending withdrawal → 400 (M14 §8). */
async function mockPATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  return ownerRoute(request, async ({ store }) => respond(updateAccount(store, Number(id), await readBody(request)), { delay: 200 }));
}

async function mockDELETE(request: Request, { params }: Ctx) {
  const { id } = await params;
  return ownerRoute(request, ({ store }) => respond(deleteAccount(store, Number(id)), { delay: 200 }));
}

// INT-020: `liveOrMock` module `payments` → Django `api/views_payments.py`; the fixture handlers above otherwise.
async function upstream(ctx: Ctx) {
  return `/api/v1/payments/payout-accounts/${encodeURIComponent((await ctx.params).id)}/`;
}

export async function PATCH(request: Request, ctx: Ctx) {
  return liveOrMock(request, "payments", await upstream(ctx), () => mockPATCH(request, ctx));
}

export async function DELETE(request: Request, ctx: Ctx) {
  return liveOrMock(request, "payments", await upstream(ctx), () => mockDELETE(request, ctx));
}
