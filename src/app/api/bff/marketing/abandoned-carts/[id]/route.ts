import { mockRoute } from "@/lib/bff/mock-route";
import { getCart } from "@/mocks/marketing/state";
import { mockJson } from "@/mocks/runtime";

/** `GET /api/v1/promotions/abandoned-carts/{id}/` `[NEEDS BACKEND]` (M13 FR-13.04). */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/marketing/abandoned-carts/[id]">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store, session }) => {
    if (session.kind !== "merchant") return mockJson({ detail: "السلات المتروكة مقصورة على مالك المتجر." }, { status: 403 });
    const c = getCart(store, id);
    return c ? mockJson(c, { delay: 100 }) : mockJson({ detail: "السلة غير موجودة." }, { status: 404 });
  });
}
