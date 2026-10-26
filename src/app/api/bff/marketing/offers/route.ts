import { liveOrMock } from "@/lib/bff/live-route";
import { mockRoute, respond } from "@/lib/bff/mock-route";
import { createOffer, listOffers } from "@/mocks/marketing/state";
import { readOfferBody } from "@/mocks/marketing/offer-body";
import { mockJson } from "@/mocks/runtime";

/** `GET|POST /api/v1/promotions/offers/` (multipart when an image is attached) (Django `api/views_marketing.py` since INT-019) (M13 FR-13.03). */
async function mockGET(request: Request) {
  return mockRoute(request, ({ store, url }) => mockJson(listOffers(store, url.searchParams), { delay: 150 }), { permission: "discounts.apply" });
}
async function mockPOST(request: Request) {
  return mockRoute(
    request,
    async ({ store }) => {
      const body = await readOfferBody(request);
      if (!body.ok) return mockJson(body.body, { status: body.status });
      return respond(createOffer(store, body.data));
    },
    { permission: "discounts.manage" },
  );
}

// INT-019: `liveOrMock` module `marketing` → Django; the fixture handler above otherwise.
export async function GET(request: Request) {
  return liveOrMock(request, "marketing", "/api/v1/promotions/offers/", () => mockGET(request));
}

export async function POST(request: Request) {
  return liveOrMock(request, "marketing", "/api/v1/promotions/offers/", () => mockPOST(request));
}
