import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { loyaltyProgram, updateLoyaltyProgram } from "@/mocks/loyalty/program";
import { mockJson } from "@/mocks/runtime";

const OWNER_ONLY = { detail: "إعدادات نقاط الولاء مقصورة على مالك المتجر." };

/** `GET|PATCH /api/v1/loyalty/program/` — the merchant side of the shared loyalty fixture (M13 FR-13.07, M35 reads it). */
async function mockGET(request: Request) {
  return mockRoute(request, ({ store, session }) => (session.kind !== "merchant" ? mockJson(OWNER_ONLY, { status: 403 }) : mockJson(loyaltyProgram(store), { delay: 100 })));
}
async function mockPATCH(request: Request) {
  return mockRoute(request, async ({ store, session }) => (session.kind !== "merchant" ? mockJson(OWNER_ONLY, { status: 403 }) : respond(updateLoyaltyProgram(store, await readBody(request)))));
}

// INT-019: `liveOrMock` module `marketing` → Django; the fixture handler above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "marketing", "/api/v1/loyalty/program/", () => mockGET(request));
}

export async function PATCH(request: Request) {
  return liveOrMock(request, "marketing", "/api/v1/loyalty/program/", () => mockPATCH(request));
}
