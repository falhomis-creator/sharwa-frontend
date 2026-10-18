import { storefrontAdapter } from "@/lib/bff/storefront-adapter";
import { mockJson } from "@/mocks/runtime";
import { availableSlots, findVisible } from "@/mocks/storefront/catalog";

/** `[NEEDS BACKEND]` `GET /api/v1/catalog/products/<id>/available-slots/?date=` (HTML-only today, M10 §7). */
export async function GET(request: Request, { params }: RouteContext<"/api/bff/catalog/products/[id]/available-slots">) {
  const { id } = await params;
  return storefrontAdapter(request, `/api/v1/catalog/products/${id}/available-slots/`, ({ store, url }) => {
    const p = findVisible(store, Number(id));
    const slots = p ? availableSlots(store, p, url.searchParams.get("date") ?? "") : null;
    return slots ? mockJson(slots, { delay: 160 }) : mockJson({ detail: "لا مواعيد لهذا المنتج." }, { status: 404 });
  });
}
