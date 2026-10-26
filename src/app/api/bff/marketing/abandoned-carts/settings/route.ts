import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { cartSettings, updateCartSettings } from "@/mocks/marketing/state";
import { mockJson } from "@/mocks/runtime";

const OWNER_ONLY = { detail: "إعدادات السلات المتروكة مقصورة على مالك المتجر." };

/** `GET|PATCH /api/v1/promotions/abandoned-cart-settings/` (Django `api/views_marketing.py` since INT-019) (M13 US-13.3.2). */
async function mockGET(request: Request) {
  return mockRoute(request, ({ store, session }) => (session.kind !== "merchant" ? mockJson(OWNER_ONLY, { status: 403 }) : mockJson(cartSettings(store), { delay: 100 })));
}
async function mockPATCH(request: Request) {
  return mockRoute(request, async ({ store, session }) => (session.kind !== "merchant" ? mockJson(OWNER_ONLY, { status: 403 }) : respond(updateCartSettings(store, await readBody(request)))));
}

// INT-019: `liveOrMock` module `marketing` → Django; the fixture handler above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "marketing", "/api/v1/promotions/abandoned-cart-settings/", () => mockGET(request));
}

export async function PATCH(request: Request) {
  return liveOrMock(request, "marketing", "/api/v1/promotions/abandoned-cart-settings/", () => mockPATCH(request));
}
