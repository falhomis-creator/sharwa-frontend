import { mockRoute, readBody, respond } from "@/lib/bff/mock-route";
import { sendCampaign } from "@/mocks/marketing/state";
import { mockJson } from "@/mocks/runtime";

/** `POST /api/v1/promotions/campaigns/{id}/send/` `{schedule_at?}` `[NEEDS BACKEND]` (M13 US-13.4.1). */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/marketing/campaigns/[id]/send">) {
  const id = Number((await params).id);
  return mockRoute(request, async ({ store, session }) => {
    if (session.kind !== "merchant") return mockJson({ detail: "الحملات مقصورة على مالك المتجر." }, { status: 403 });
    return respond(sendCampaign(store, id, await readBody(request)), { delay: 400 });
  });
}
