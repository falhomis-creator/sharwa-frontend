import { readBody, respond } from "@/lib/bff/mock-route";
import { deleteAccount, updateAccount } from "@/mocks/payments/state";
import { ownerRoute } from "@/mocks/payments/routes";

/** `PATCH/DELETE /api/v1/payments/payout-accounts/<id>/` — delete of an account tied to a pending withdrawal → 400 (M14 §8). */
export async function PATCH(request: Request, { params }: RouteContext<"/api/bff/payments/payout-accounts/[id]">) {
  const { id } = await params;
  return ownerRoute(request, async ({ store }) => respond(updateAccount(store, Number(id), await readBody(request)), { delay: 200 }));
}

export async function DELETE(request: Request, { params }: RouteContext<"/api/bff/payments/payout-accounts/[id]">) {
  const { id } = await params;
  return ownerRoute(request, ({ store }) => respond(deleteAccount(store, Number(id)), { delay: 200 }));
}
