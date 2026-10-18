import { mockRoute } from "@/lib/bff/mock-route";
import { listCarts } from "@/mocks/marketing/state";
import { mockJson } from "@/mocks/runtime";

/** `GET /api/v1/promotions/abandoned-carts/` `[NEEDS BACKEND]` (M13 FR-13.04) — owner only. */
export async function GET(request: Request) {
  return mockRoute(request, ({ store, url, session }) => {
    if (session.kind !== "merchant") return mockJson({ detail: "السلات المتروكة مقصورة على مالك المتجر." }, { status: 403 });
    return mockJson(listCarts(store, url.searchParams), { delay: 150 });
  });
}
