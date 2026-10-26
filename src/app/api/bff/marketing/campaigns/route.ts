import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { createCampaign, listCampaigns } from "@/mocks/marketing/state";
import { mockJson } from "@/mocks/runtime";

/** `GET|POST /api/v1/promotions/campaigns/` (Django `api/views_marketing.py` since INT-019) (M13 FR-13.05) — owner only. */
async function mockGET(request: Request) {
  return mockRoute(request, ({ store, url, session }) => {
    if (session.kind !== "merchant") return mockJson({ detail: "الحملات مقصورة على مالك المتجر." }, { status: 403 });
    return mockJson(listCampaigns(store, url.searchParams), { delay: 150 });
  });
}
async function mockPOST(request: Request) {
  return mockRoute(request, async ({ store, session }) => {
    if (session.kind !== "merchant") return mockJson({ detail: "الحملات مقصورة على مالك المتجر." }, { status: 403 });
    return respond(createCampaign(store, await readBody(request)));
  });
}

// INT-019: `liveOrMock` module `marketing` → Django; the fixture handler above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "marketing", "/api/v1/promotions/campaigns/", () => mockGET(request));
}

export async function POST(request: Request) {
  return liveOrMock(request, "marketing", "/api/v1/promotions/campaigns/", () => mockPOST(request));
}
