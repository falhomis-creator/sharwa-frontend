import { mockRoute, readBody } from "@/lib/bff/mock-route";
import { gifting, updateGifting } from "@/mocks/marketing/state";
import { mockJson } from "@/mocks/runtime";

const OWNER_ONLY = { detail: "إعدادات الإهداء مقصورة على مالك المتجر." };

/** `GET|PATCH /api/v1/promotions/gift-settings/` `{is_enabled}` `[NEEDS BACKEND]` (M13 FR-13.08). */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, session }) => (session.kind !== "merchant" ? mockJson(OWNER_ONLY, { status: 403 }) : mockJson(gifting(store), { delay: 80 })));
}
export async function PATCH(request: Request) {
  return mockRoute(request, async ({ store, session }) => (session.kind !== "merchant" ? mockJson(OWNER_ONLY, { status: 403 }) : mockJson(updateGifting(store, await readBody(request)), { delay: 150 })));
}
