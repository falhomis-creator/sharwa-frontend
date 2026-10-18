import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { createCampaign, listCampaigns } from "@/mocks/marketing/state";
import { mockJson } from "@/mocks/runtime";

/** `GET|POST /api/v1/promotions/campaigns/` `[NEEDS BACKEND]` (M13 FR-13.05) — owner only. */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, url, session }) => {
    if (session.kind !== "merchant") return mockJson({ detail: "الحملات مقصورة على مالك المتجر." }, { status: 403 });
    return mockJson(listCampaigns(store, url.searchParams), { delay: 150 });
  });
}
export async function POST(request: Request) {
  return mockRoute(request, async ({ store, session }) => {
    if (session.kind !== "merchant") return mockJson({ detail: "الحملات مقصورة على مالك المتجر." }, { status: 403 });
    return respond(createCampaign(store, await readBody(request)));
  });
}
