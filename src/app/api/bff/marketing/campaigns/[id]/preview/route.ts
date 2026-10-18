import { mockRoute } from "@/lib/bff/mock-route";
import { previewCampaign } from "@/mocks/marketing/state";
import { mockJson } from "@/mocks/runtime";

/** `GET /api/v1/promotions/campaigns/{id}/preview/` `[NEEDS BACKEND]` (M13 US-13.4.1 — count + rendered message). */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/marketing/campaigns/[id]/preview">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store, session }) => {
    if (session.kind !== "merchant") return mockJson({ detail: "الحملات مقصورة على مالك المتجر." }, { status: 403 });
    const p = previewCampaign(store, id);
    return p ? mockJson(p, { delay: 250 }) : mockJson({ detail: "الحملة غير موجودة." }, { status: 404 });
  });
}
