import { readBody, respond } from "@/lib/bff/mock-route";
import { mockJson } from "@/mocks/runtime";
import { getGateway, setGatewayEnabled } from "@/mocks/payments/state";
import { ownerRoute } from "@/mocks/payments/routes";

/** `GET` one gateway, `PATCH /api/v1/payments/gateways/<code>/` `{is_enabled}` (M14 §7, FR-14.05). */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/payments/gateways/[code]">) {
  const { code } = await params;
  return ownerRoute(request, ({ store }) => {
    const g = getGateway(store, code);
    return g ? mockJson(g, { delay: 150 }) : mockJson({ detail: "البوابة غير معروفة." }, { status: 404 });
  });
}

export async function PATCH(request: Request, { params }: RouteContext<"/api/bff/payments/gateways/[code]">) {
  const { code } = await params;
  return ownerRoute(request, async ({ store }) => respond(setGatewayEnabled(store, code, await readBody(request)), { delay: 220 }));
}
