import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody } from "@/lib/bff/mock-route";
import { gifting, updateGifting } from "@/mocks/marketing/state";
import { mockJson } from "@/mocks/runtime";

const OWNER_ONLY = { detail: "إعدادات الإهداء مقصورة على مالك المتجر." };

/** `GET|PATCH /api/v1/promotions/gift-settings/` `{is_enabled}` (Django `api/views_marketing.py` since INT-019) (M13 FR-13.08). */
async function mockGET(request: Request) {
  return mockRoute(request, ({ store, session }) => (session.kind !== "merchant" ? mockJson(OWNER_ONLY, { status: 403 }) : mockJson(gifting(store), { delay: 80 })));
}
async function mockPATCH(request: Request) {
  return mockRoute(request, async ({ store, session }) => (session.kind !== "merchant" ? mockJson(OWNER_ONLY, { status: 403 }) : mockJson(updateGifting(store, await readBody(request)), { delay: 150 })));
}

// INT-019: `liveOrMock` module `marketing` → Django; the fixture handler above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "marketing", "/api/v1/promotions/gift-settings/", () => mockGET(request));
}

export async function PATCH(request: Request) {
  return liveOrMock(request, "marketing", "/api/v1/promotions/gift-settings/", () => mockPATCH(request));
}
