import { mockRoute, respond } from "@/lib/bff/mock-route";
import { remindCart } from "@/mocks/marketing/state";
import { mockJson } from "@/mocks/runtime";

/** `POST /api/v1/promotions/abandoned-carts/{id}/remind/` `[NEEDS BACKEND]` (M13 US-13.3.1). */
export async function POST(request: Request, { params }: RouteContext<"/api/bff/marketing/abandoned-carts/[id]/remind">) {
  const id = Number((await params).id);
  return mockRoute(request, ({ store, session }) => {
    if (session.kind !== "merchant") return mockJson({ detail: "السلات المتروكة مقصورة على مالك المتجر." }, { status: 403 });
    return respond(remindCart(store, id));
  });
}
