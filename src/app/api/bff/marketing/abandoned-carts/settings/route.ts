import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { cartSettings, updateCartSettings } from "@/mocks/marketing/state";
import { mockJson } from "@/mocks/runtime";

const OWNER_ONLY = { detail: "إعدادات السلات المتروكة مقصورة على مالك المتجر." };

/** `GET|PATCH /api/v1/promotions/abandoned-cart-settings/` `[NEEDS BACKEND]` (M13 US-13.3.2). */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, session }) => (session.kind !== "merchant" ? mockJson(OWNER_ONLY, { status: 403 }) : mockJson(cartSettings(store), { delay: 100 })));
}
export async function PATCH(request: Request) {
  return mockRoute(request, async ({ store, session }) => (session.kind !== "merchant" ? mockJson(OWNER_ONLY, { status: 403 }) : respond(updateCartSettings(store, await readBody(request)))));
}
