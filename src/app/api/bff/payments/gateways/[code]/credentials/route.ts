import { readBody, respond } from "@/lib/bff/mock-route";
import { saveCredentials } from "@/mocks/payments/state";
import { ownerRoute } from "@/mocks/payments/routes";

/** `PUT /api/v1/payments/gateways/<code>/credentials/` `{<field>: value}` — empty fields keep the stored value → 204 (M14 §7). */
export async function PUT(request: Request, { params }: RouteContext<"/api/bff/payments/gateways/[code]/credentials">) {
  const { code } = await params;
  return ownerRoute(request, async ({ store }) => respond(saveCredentials(store, code, await readBody(request)), { delay: 320 }));
}
